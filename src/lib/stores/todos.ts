import { writable, get } from "svelte/store";
import type { Todo } from "../types";
import { supabase } from "../supabase";

export interface TodosState {
  items: Todo[];
  loading: boolean;
  error: string | null;
  editingId: string | null;
}

function createTodosStore() {
  const store = writable<TodosState>({
    items: [],
    loading: true,
    error: null,
    editingId: null,
  });

  const { subscribe, update } = store;
  let isMoving = false;
  let lastUpdateTime = Date.now();

  function reorderTodos(todos: Todo[]) {
    return todos.map((todo, index) => ({
      ...todo,
      order: index,
    }));
  }

  return {
    subscribe,
    setLoading: (loading: boolean) =>
      update((state) => ({ ...state, loading })),
    setError: (error: string | null) =>
      update((state) => ({ ...state, error })),
    setEditingId: (editingId: string | null) =>
      update((state) => ({ ...state, editingId })),

    load: async (listId: string) => {
      try {
        const { data, error: supabaseError } = await supabase
          .from("todos")
          .select("*")
          .eq("list_id", listId)
          .order("order");

        if (supabaseError) throw supabaseError;

        update((state) => ({ ...state, items: data || [], error: null }));
      } catch (e) {
        update((state) => ({ ...state, error: "Failed to load todos" }));
      }
    },

    add: async (listId: string, title: string) => {
      const state = get(store);
      const order = state.items.filter((t: Todo) => !t.completed).length;
      const tempId = "temp_" + Date.now();

      const newTodo: Todo = {
        id: tempId,
        title: title.trim(),
        completed: false,
        order,
        list_id: listId,
        created_at: new Date().toISOString(),
      };

      update((state) => ({ ...state, items: [...state.items, newTodo] }));

      try {
        const { data, error: supabaseError } = await supabase
          .from("todos")
          .insert([
            {
              title: newTodo.title,
              completed: newTodo.completed,
              order: newTodo.order,
              list_id: newTodo.list_id,
            },
          ])
          .select();

        if (supabaseError) throw supabaseError;

        if (data && data[0]) {
          update((state) => ({
            ...state,
            items: state.items.map((t: Todo) =>
              t.id === tempId ? { ...t, id: data[0].id } : t
            ),
          }));
        }
      } catch (e) {
        update((state) => ({
          ...state,
          error: "Failed to add todo",
          items: state.items.filter((t: Todo) => t.id !== tempId),
        }));
      }
    },

    delete: async (todo: Todo) => {
      update((state) => ({
        ...state,
        items: state.items.filter((t: Todo) => t.id !== todo.id),
      }));

      try {
        const { error: supabaseError } = await supabase
          .from("todos")
          .delete()
          .eq("id", todo.id);

        if (supabaseError) throw supabaseError;
      } catch (e) {
        update((state) => ({ ...state, error: "Failed to delete todo" }));
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
      update((state) => ({
        ...state,
        items: state.items.map((t: Todo) =>
          t.id === todo.id
            ? { ...t, completed: newCompleted, order: newOrder }
            : t
        ),
      }));

      try {
        const { error: supabaseError } = await supabase
          .from("todos")
          .update({
            completed: newCompleted,
            order: newOrder,
          })
          .eq("id", todo.id);

        if (supabaseError) throw supabaseError;
      } catch (e) {
        if (lastUpdateTime === updateStartTime) {
          update((state) => ({ ...state, error: "Failed to update todo" }));
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
      update((state) => ({
        ...state,
        items: state.items.map((t: Todo) =>
          t.id === todo.id ? { ...t, title: newTitle.trim() } : t
        ),
        editingId: null,
      }));

      try {
        const { error: supabaseError } = await supabase
          .from("todos")
          .update({ title: newTitle.trim() })
          .eq("id", todo.id);

        if (supabaseError) throw supabaseError;
      } catch (e) {
        if (lastUpdateTime === updateStartTime) {
          update((state) => ({
            ...state,
            error: "Failed to update todo title",
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
          .sort((a: Todo, b: Todo) => a.order - b.order)
      );

      const currentIndex = activeTodos.findIndex((t: Todo) => t.id === todo.id);
      if (
        (direction === "up" && currentIndex <= 0) ||
        (direction === "down" && currentIndex === activeTodos.length - 1)
      ) {
        isMoving = false;
        return;
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      const targetTodo = activeTodos[targetIndex];
      const currentTodo = activeTodos[currentIndex];

      [activeTodos[currentIndex], activeTodos[targetIndex]] = [
        { ...activeTodos[targetIndex], order: currentIndex },
        { ...activeTodos[currentIndex], order: targetIndex },
      ];

      // Optimistic update
      update((state) => ({
        ...state,
        items: state.items.map((t: Todo) => {
          const updatedTodo = activeTodos.find((at) => at.id === t.id);
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

        const { error: supabaseError } = await supabase
          .from("todos")
          .upsert(updates);

        if (supabaseError) throw supabaseError;

        // Ne mettre à jour que si aucune autre mise à jour n'a été faite entre temps
        if (lastUpdateTime === updateStartTime) {
          update((state) => ({
            ...state,
            items: state.items.map((t: Todo) => {
              const updatedTodo = activeTodos.find((at) => at.id === t.id);
              return updatedTodo || t;
            }),
          }));
        }
      } catch (e) {
        if (lastUpdateTime === updateStartTime) {
          update((state) => ({ ...state, error: "Failed to move todo" }));
        }
      } finally {
        if (lastUpdateTime === updateStartTime) {
          isMoving = false;
        }
      }
    },
  };
}

export const todosStore = createTodosStore();
