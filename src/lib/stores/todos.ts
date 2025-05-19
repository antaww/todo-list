import {get, writable} from "svelte/store";
import {addToast} from "@components/ui/Toaster.svelte";
import {lastSeenStore} from "$helpers/lastSeen";
import {supabase} from "$lib/supabase";
import type {Todo} from "$lib/types";
import {historyStore} from "$stores/history";

export interface TodosState {
	items: Todo[];
	loading: boolean;
	error: string | null;
	editingId: string | null;
}

// Time in milliseconds to consider a new task
const newTasksThreshold = 200;

function createTodosStore() {
	const store = writable<TodosState>({
		items: [],
		loading: true,
		error: null,
		editingId: null,
	});

	const {
		subscribe,
		update,
	} = store;
	let isMoving = false;
	let lastUpdateTime = Date.now();
	let currentListId: string | null = null;

	function reorderTodos(todos: Todo[]) {
		return todos.map((todo, index) => ({
			...todo,
			order: index,
		}));
	}

	return {
		subscribe,
		setLoading: (loading: boolean) =>
			update(state => ({
				...state,
				loading,
			})),
		setError: (error: string | null) =>
			update(state => ({
				...state,
				error,
			})),
		setEditingId: (editingId: string | null) =>
			update(state => ({
				...state,
				editingId,
			})),

		load: async (listId: string) => {
			try {
				currentListId = listId;
				const lastSeen = get(lastSeenStore);

				const {
					data,
					error: supabaseError,
				} = await supabase
					.from("todos")
					.select("*")
					.eq("list_id", listId)
					.order("order");

				if (supabaseError) throw supabaseError;

				// Check if there are new tasks since the last visit
				// Only if we already have loaded the list before
				if (data && get(historyStore).some(h => h.id === listId)) {
					const newTodos = data.filter(todo => {
						const createdAt = new Date(todo.created_at).getTime();
						const diff = createdAt - lastSeen;
						return diff > newTasksThreshold;
					});

					if (newTodos.length > 0 && currentListId === listId) {
						addToast({
							data: {
								title: "New task",
								description: `${newTodos.length} new task${
									newTodos.length > 1 ? "s" : ""
								} added since your last visit.`,
								type: "info",
							},
						});
					}
				}

				update(state => ({
					...state,
					items: data || [],
					error: null,
				}));
			} catch (e) {
				update(state => ({
					...state,
					error: "Failed to load todos",
				}));
			}
		},

		add: async (listId: string, { title, difficulty, description }: { title: string; difficulty: number; description?: string }) => {
			const state = get(store);
			const order = state.items.filter((t: Todo) => !t.completed).length;
			const tempId = 'temp_' + Date.now();

			const newTodo: Todo = {
				completed: false,
				created_at: new Date().toISOString(),
				description,
				difficulty,
				id: tempId,
				list_id: listId,
				order,
				title: title.trim()
			};

			update((state) => ({
				...state,
				items: [
					...state.items,
					newTodo
				]
			}));

			try {
				const {
					data,
					error: supabaseError
				} = await supabase
					.from('todos')
					.insert([
						{
							completed: newTodo.completed,
							description: newTodo.description,
							difficulty: newTodo.difficulty,
							list_id: newTodo.list_id,
							order: newTodo.order,
							title: newTodo.title
						}
					])
					.select();

				if (supabaseError) throw supabaseError;

				if (data && data[0]) {
					update((state) => ({
						...state,
						items: state.items.map((t: Todo) =>
							t.id === tempId ?
								{
									...t,
									id: data[0].id
								} :
								t
						)
					}));
				}
			} catch (e) {
				update((state) => ({
					...state,
					error: 'Failed to add todo',
					items: state.items.filter((t: Todo) => t.id !== tempId)
				}));
			}
		},

		delete: async (todo: Todo) => {
			update(state => ({
				...state,
				items: state.items.filter((t: Todo) => t.id !== todo.id),
			}));

			try {
				const {error: supabaseError} = await supabase
					.from("todos")
					.delete()
					.eq("id", todo.id);

				if (supabaseError) throw supabaseError;
			} catch (e) {
				update(state => ({
					...state,
					error: "Failed to delete todo",
				}));
				await todosStore.load(todo.list_id);
			}
		},

		toggle: async (todo: Todo) => {
			if (isMoving) return;
			isMoving = true;
			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			const newCompleted = !todo.completed;
			const state = get(store);
			const newOrder = newCompleted
			                 ? state.items.filter((t: Todo) => t.completed).length
			                 : state.items.filter((t: Todo) => !t.completed).length;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id
					?
						{
							...t,
							completed: newCompleted,
							order: newOrder,
						}
					:
					t,
				),
			}));

			try {
				const {error: supabaseError} = await supabase
					.from("todos")
					.update({
						completed: newCompleted,
						order: newOrder,
					})
					.eq("id", todo.id);

				if (supabaseError) throw supabaseError;
			} catch (e) {
				if (lastUpdateTime === updateStartTime) {
					update(state => ({
						...state,
						error: "Failed to update todo",
					}));
				}
			} finally {
				if (lastUpdateTime === updateStartTime) {
					isMoving = false;
				}
			}
		},

		updateTitle: async (todo: Todo, newTitle: string) => {
			if (!newTitle.trim() || newTitle.trim() === todo.title) {
				return;
			}

			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id ?
						{
							...t,
							title: newTitle.trim(),
						} :
					t,
				),
				editingId: null,
			}));

			try {
				const {error: supabaseError} = await supabase
					.from("todos")
					.update({title: newTitle.trim()})
					.eq("id", todo.id);

				if (supabaseError) throw supabaseError;
			} catch (e) {
				if (lastUpdateTime === updateStartTime) {
					update(state => ({
						...state,
						error: "Failed to update todo title",
					}));
				}
			}
		},

		updateDescription: async (todo: Todo, newDescription: string) => {
			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;
			const oldDescription = todo.description;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id ?
						{
							...t,
							description: newDescription.trim(),
						} :
					t,
				),
			}));

			try {
				console.log('Attempting to update description for todo:', todo.id, 'to:', newDescription.trim());
				const { data: updateData, error: supabaseError } = await supabase
					.from('todos')
					.update({ description: newDescription.trim() })
					.eq('id', todo.id)
					.select(); // Adding .select() for more info

				if (supabaseError) {
					console.error('Supabase error updating description:', supabaseError);
					throw supabaseError;
				}
				console.log('Supabase description update successful:', updateData);
			} catch (e) {
				console.error('Caught error in updateDescription:', e);
				if (lastUpdateTime === updateStartTime) { // Revert only if this is the last update attempt
					update(state => ({
						...state,
						items: state.items.map((t: Todo) =>
							t.id === todo.id ?
								{
									...t,
									description: oldDescription, // Revert to original description
								} :
								t,
						),
						error: 'Failed to update todo description',
					}));
				}
			}
		},

		updateDifficulty: async (todo: Todo, newDifficulty: number) => {
			if (newDifficulty < 0 || newDifficulty > 10 || newDifficulty === todo.difficulty) {
				return;
			}

			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id ?
						{
							...t,
							difficulty: newDifficulty,
						} :
					t,
				),
			}));

			try {
				const { error: supabaseError } = await supabase
					.from('todos')
					.update({ difficulty: newDifficulty })
					.eq('id', todo.id);

				if (supabaseError) throw supabaseError;
			} catch (e) {
				if (lastUpdateTime === updateStartTime) { // Revert only if this is the last update attempt
					update(state => ({
						...state,
						items: state.items.map((t: Todo) =>
							t.id === todo.id ?
								{
									...t,
									difficulty: todo.difficulty, // Revert to original difficulty
								} :
								t,
						),
						error: 'Failed to update todo difficulty',
					}));
				}
			}
		},

		move: async (todo: Todo, direction: "up" | "down") => {
			if (isMoving) return;
			isMoving = true;
			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			const state = get(store);
			const activeTodos = reorderTodos(
				state.items
				     .filter((t: Todo) => !t.completed)
				     .sort((a: Todo, b: Todo) => a.order - b.order),
			);

			const currentIndex = activeTodos.findIndex((t: Todo) => t.id === todo.id);
			if (
				direction === "up" && currentIndex <= 0 ||
				direction === "down" && currentIndex === activeTodos.length - 1
			) {
				isMoving = false;
				return;
			}

			const targetIndex =
				direction === "up" ? currentIndex - 1 : currentIndex + 1;
			const targetTodo = activeTodos[targetIndex];
			const currentTodo = activeTodos[currentIndex];

			[
				activeTodos[currentIndex],
				activeTodos[targetIndex],
			] = [
				{
					...activeTodos[targetIndex],
					order: currentIndex,
				},
				{
					...activeTodos[currentIndex],
					order: targetIndex,
				},
			];

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) => {
					const updatedTodo = activeTodos.find(at => at.id === t.id);
					return updatedTodo || t;
				}),
			}));

			try {
				const updates = [
					{
						id: currentTodo.id,
						order: targetIndex,
						title: currentTodo.title,
						completed: currentTodo.completed,
						list_id: currentTodo.list_id,
					},
					{
						id: targetTodo.id,
						order: currentIndex,
						title: targetTodo.title,
						completed: targetTodo.completed,
						list_id: targetTodo.list_id,
					},
				];

				const {error: supabaseError} = await supabase
					.from("todos")
					.upsert(updates);

				if (supabaseError) throw supabaseError;

				// Ne mettre à jour que si aucune autre mise à jour n'a été faite entre temps
				if (lastUpdateTime === updateStartTime) {
					update(state => ({
						...state,
						items: state.items.map((t: Todo) => {
							const updatedTodo = activeTodos.find(at => at.id === t.id);
							return updatedTodo || t;
						}),
					}));
				}
			} catch (e) {
				if (lastUpdateTime === updateStartTime) {
					update(state => ({
						...state,
						error: "Failed to move todo",
					}));
				}
			} finally {
				if (lastUpdateTime === updateStartTime) {
					isMoving = false;
				}
			}
		},

		deleteAllCompleted: async (listId: string) => {
			const state = get(store);
			const completedTodos = state.items.filter((t: Todo) => t.completed);

			if (completedTodos.length === 0) return;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.filter((t: Todo) => !t.completed),
			}));

			try {
				const completedIds = completedTodos.map(todo => todo.id);

				const {error: supabaseError} = await supabase
					.from("todos")
					.delete()
					.in("id", completedIds);

				if (supabaseError) throw supabaseError;
			} catch (e) {
				update(state => ({
					...state,
					error: "Failed to delete completed todos",
				}));
				await todosStore.load(listId);
			}
		},
	};
}

export const todosStore = createTodosStore();
