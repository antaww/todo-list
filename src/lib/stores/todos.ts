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

		add: async (listId: string, { title, difficulty, description, assignedTo, status }: { title: string; difficulty: number; description?: string; assignedTo?: string; status?: Todo['status'] }) => {
			const state = get(store);
			const order = state.items.filter((t: Todo) => t.status === 'Todo').length;
			const tempId = 'temp_' + Date.now();

			const newTodo: Todo = {
				status: status || 'Todo',
				created_at: new Date().toISOString(),
				description,
				difficulty,
				id: tempId,
				list_id: listId,
				order,
				title: title.trim(),
				assigned_to: assignedTo ? assignedTo.trim() : undefined
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
							status: newTodo.status,
							description: newTodo.description,
							difficulty: newTodo.difficulty,
							list_id: newTodo.list_id,
							order: newTodo.order,
							title: newTodo.title,
							assigned_to: newTodo.assigned_to
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

			let newStatus: Todo['status'];
			let newOrder = todo.order;

			if (todo.status === 'Done') {
				newStatus = 'Todo';
			} else if (todo.status === 'Todo') {
				newStatus = 'Done';
			} else {
				newStatus = 'Done';
			}

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id
					?
						{
							...t,
							status: newStatus,
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
						status: newStatus,
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

		toggleWorking: async (todo: Todo) => {
			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			let newStatus: Todo['status'];
			if (todo.status === 'Working') {
				newStatus = 'Todo'; // Or derive previous non-working state if needed, for now, defaults to Todo
			} else {
				newStatus = 'Working';
			}

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id
					? {
							...t,
							status: newStatus,
						}
					: t,
				),
			}));

			try {
				const {error: supabaseError} = await supabase
					.from("todos")
					.update({
						status: newStatus,
					})
					.eq("id", todo.id);

				if (supabaseError) throw supabaseError;

				addToast({
					data: {
						title: newStatus === 'Working' ? "Started working" : "Stopped working",
						description: `${todo.title.substring(0, 30)}${todo.title.length > 30 ? '...' : ''}`,
						type: "success",
					},
				});
			} catch (e) {
				if (lastUpdateTime === updateStartTime) {
					update(state => ({
						...state,
						error: "Failed to update working status",
						items: state.items.map((t: Todo) =>
							t.id === todo.id
							? {
									...t,
									status: todo.status, // Revert to original status
								}
							: t,
						),
					}));
				}
			}
		},

		updateTitle: async (todo: Todo, newTitle: string) => {
			if (!newTitle.trim() || newTitle.trim() === todo.title) {
				return;
			}

			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;

			const state = get(store);
			const activeTodos = reorderTodos(
				state.items
				     .filter((t: Todo) => t.status === 'Todo' || t.status === 'Working') // Updated filter
				     .sort((a, b) => (a.order || 0) - (b.order || 0)),
			);
			const completedTodos = reorderTodos(
				state.items
				     .filter((t: Todo) => t.status === 'Done') // Updated filter
				     .sort((a, b) => (a.order || 0) - (b.order || 0)),
			);

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
				const { data: updateData, error: supabaseError } = await supabase
					.from('todos')
					.update({ description: newDescription.trim() })
					.eq('id', todo.id)
					.select();

				if (supabaseError) {
					console.error('Supabase error updating description:', supabaseError);
					throw supabaseError;
				}
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

		updateAssignedTo: async (todo: Todo, newAssignedTo: string) => {
			const updateStartTime = Date.now();
			lastUpdateTime = updateStartTime;
			const oldAssignedTo = todo.assigned_to;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.map((t: Todo) =>
					t.id === todo.id ?
						{
							...t,
							assigned_to: newAssignedTo.trim(),
						} :
						t,
				),
			}));

			try {
				const { error: supabaseError } = await supabase
					.from('todos')
					.update({ assigned_to: newAssignedTo.trim() })
					.eq('id', todo.id);

				if (supabaseError) {
					console.error('Supabase error updating assigned_to:', supabaseError);
					throw supabaseError;
				}
			} catch (e) {
				console.error('Caught error in updateAssignedTo:', e);
				if (lastUpdateTime === updateStartTime) { // Revert only if this is the last update attempt
					update(state => ({
						...state,
						items: state.items.map((t: Todo) =>
							t.id === todo.id ?
								{
									...t,
									assigned_to: oldAssignedTo, // Revert to original value
								} :
								t,
						),
						error: 'Failed to update assigned person',
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
				     .filter((t: Todo) => t.status === 'Todo' || t.status === 'Working') // Already updated in previous step, ensure consistency
				     .sort((a: Todo, b: Todo) => (a.order ?? 0) - (b.order ?? 0)),
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
						status: currentTodo.status, // Use status
						list_id: currentTodo.list_id,
					},
					{
						id: targetTodo.id,
						order: currentIndex,
						title: targetTodo.title,
						status: targetTodo.status, // Use status
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
			const completedTodos = state.items.filter((t: Todo) => t.status === 'Done');

			if (completedTodos.length === 0) return;

			// Optimistic update
			update(state => ({
				...state,
				items: state.items.filter((t: Todo) => t.status !== 'Done'),
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
