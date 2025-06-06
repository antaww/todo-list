import {get, writable} from "svelte/store";
import {supabase} from "$lib/supabase";
import { historyStore } from "$stores/history";

export interface ListState {
	id: string;
	title: string;
	loading: boolean;
	error: string | null;
	isEditing: boolean;
}

function createListStore() {
	const store = writable<ListState>({
		id: "",
		title: "",
		loading: true,
		error: null,
		isEditing: false,
	});

	const {
		subscribe,
		set,
		update,
	} = store;

	async function loadListTitle(listId: string) {
		try {
			const {
				data,
				error: supabaseError,
			} = await supabase
				.from("lists")
				.select("*")
				.eq("id", listId)
				.maybeSingle();

			if (supabaseError) {
				if (supabaseError.code === "42P01") {
					update(state => ({
						...state,
						title: "Untitled List",
					}));
					historyStore.add(listId, "Untitled List");
					return;
				}
				throw supabaseError;
			}

			if (!data) {
				// Si la liste n'existe pas, on la crée
				const {error: insertError} = await supabase
					.from("lists")
					.insert([
						{
							id: listId,
							title: "Untitled List",
						},
					])
					.single();

				if (insertError) throw insertError;

				update(state => ({
					...state,
					title: "Untitled List",
				}));
				historyStore.add(listId, "Untitled List");
				return;
			}

			const confirmedTitle = data.title || "Untitled List";
			update(state => ({
				...state,
				title: confirmedTitle,
			}));
			historyStore.add(listId, confirmedTitle);
		} catch (e) {
			console.error('Error loading list title:', e);
			const errorTitle = "Untitled List";
			update(state => ({
				...state,
				title: errorTitle,
			}));
			historyStore.add(listId, errorTitle);
		}
	}

	async function ensureListsTableExists() {
		try {
			const {error: checkError} = await supabase
				.from("lists")
				.select("id")
				.limit(1);

			if (!checkError) return;

			const {error: createError} = await supabase.rpc("execute_sql", {
				sql_query: `
          CREATE TABLE IF NOT EXISTS lists (
            id text PRIMARY KEY,
            title text NOT NULL DEFAULT 'Untitled List',
            created_at timestamptz DEFAULT now()
          );

          ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Allow public access on lists"
            ON lists
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
        `,
			});

			if (createError) {
				throw new Error("Failed to create lists table");
			}
		} catch (e) {
			throw new Error("Failed to ensure lists table exists");
		}
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
		setEditing: (isEditing: boolean) =>
			update(state => ({
				...state,
				isEditing,
			})),

		load: async (listId: string) => {
			try {
				const {
					data,
					error: supabaseError,
				} = await supabase
					.from("lists")
					.select("title")
					.eq("id", listId)
					.single();

				if (supabaseError) {
					if (supabaseError.code === "42P01") {
						update(state => ({
							...state,
							title: "Untitled List",
						}));
						historyStore.add(listId, "Untitled List");
						return;
					}
					throw supabaseError;
				}
				const confirmedTitle = data?.title || "Untitled List";
				update(state => ({
					...state,
					title: confirmedTitle,
				}));
				historyStore.add(listId, confirmedTitle);
			} catch (e) {
				update(state => ({
					...state,
					title: "Untitled List",
				}));
				historyStore.add(listId, "Untitled List");
			}
		},

		initialize: async (listId: string) => {
			update(state => ({
				...state,
				id: listId,
			}));

			try {
				const {error: testError} = await supabase
					.from("todos")
					.select(
						"count",
						{
							count: "exact",
							head: true,
						},
					);

				if (testError) {
					throw new Error("Database connection failed");
				}

				await ensureListsTableExists();
				await loadListTitle(listId);
			} catch (e) {
				update(state => ({
					...state,
					error:
						e instanceof Error
						? e.message
						: "An error occurred while initializing",
				}));
				historyStore.add(listId, "Untitled List");
			}
		},

		updateTitle: async (newTitle: string) => {
			const trimmedTitle = newTitle.trim();
			const finalTitle = trimmedTitle === '' ? "Untitled List" : trimmedTitle;

			const state = get(store);
			if (finalTitle === state.title) return;

			update(state => ({
				...state,
				title: finalTitle,
			}));

			try {
				const {data: currentData} = await supabase
					.from("lists")
					.select("title")
					.eq("id", state.id)
					.single();

				if (!currentData) {
					const {error: insertError} = await supabase.from("lists").insert([
						{
							id: state.id,
							title: finalTitle,
						},
					]);

					if (insertError) throw insertError;
					historyStore.add(state.id, finalTitle);
					return;
				}

				const {error: updateError} = await supabase
					.from("lists")
					.update({title: finalTitle})
					.eq("id", state.id);

				if (updateError) throw updateError;
				historyStore.add(state.id, finalTitle);
			} catch (e) {
				update(state => ({
					...state,
					error: "Failed to update list title",
				}));
				console.error('Error updating list title in DB:', e);
			}
		},

		destroy: () => {
			// No need to unsubscribe from realtime channel here
		},
	};
}

export const listStore = createListStore();
