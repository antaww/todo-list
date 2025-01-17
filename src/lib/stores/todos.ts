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
      const newCompleted = !todo.completed;
      const state = get(store);
      const newOrder = newCompleted
        ? state.items.filter((t: Todo) => t.completed).length
        : state.items.filter((t: Todo) => !t.completed).length;

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
        update((state) => ({ ...state, error: "Failed to update todo" }));
        await todosStore.load(todo.list_id);
      }
    },

    updateTitle: async (todo: Todo, newTitle: string) => {
      if (!newTitle.trim() || newTitle.trim() === todo.title) {
        return;
      }

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
        update((state) => ({ ...state, error: "Failed to update todo title" }));
        await todosStore.load(todo.list_id);
      }
    },

    move: async (todo: Todo, direction: "up" | "down") => {
      const state = get(store);
      const activeTodos = state.items
        .filter((t: Todo) => !t.completed)
        .sort((a: Todo, b: Todo) => a.order - b.order);

      const currentIndex = activeTodos.findIndex((t: Todo) => t.id === todo.id);
      if (
        (direction === "up" && currentIndex <= 0) ||
        (direction === "down" && currentIndex === activeTodos.length - 1)
      ) {
        return;
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      const targetTodo = activeTodos[targetIndex];

      update((state) => ({
        ...state,
        items: state.items.map((t: Todo) => {
          if (t.id === todo.id) return { ...t, order: targetTodo.order };
          if (t.id === targetTodo.id) return { ...t, order: todo.order };
          return t;
        }),
      }));

      try {
        const updates = [
          {
            id: todo.id,
            order: targetTodo.order,
            title: todo.title,
            completed: todo.completed,
            list_id: todo.list_id,
          },
          {
            id: targetTodo.id,
            order: todo.order,
            title: targetTodo.title,
            completed: targetTodo.completed,
            list_id: targetTodo.list_id,
          },
        ];

        const { error: supabaseError } = await supabase
          .from("todos")
          .upsert(updates);

        if (supabaseError) throw supabaseError;
      } catch (e) {
        update((state) => ({ ...state, error: "Failed to move todo" }));
        await todosStore.load(todo.list_id);
      }
    },
  };
}

export const todosStore = createTodosStore();
