import {get, writable} from "svelte/store";
import type {FavoriteList} from "./favorites";
import {favoritesStore} from "./favorites";

const STORAGE_KEY = "todo-list-history";
const MAX_HISTORY = 30;

function createHistoryStore() {
	const initialHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
	const store = writable<FavoriteList[]>(initialHistory);
	const {
		subscribe,
		update,
	} = store;

	return {
		subscribe,
		add: (id: string, title: string) => {
			const favorites = get(favoritesStore);
			if (favorites.some(f => f.id === id)) return;

			update(history => {
				const newHistory = [
					{
						id,
						title,
					},
					...history.filter(h => h.id !== id),
				].slice(0, MAX_HISTORY);

				localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				return newHistory;
			});
		},
		remove: (id: string) =>
			update(history => {
				const newHistory = history.filter(h => h.id !== id);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				return newHistory;
			}),
		clear: () =>
			update(() => {
				localStorage.setItem(STORAGE_KEY, "[]");
				return [];
			}),
		updateTitle: (id: string, newTitle: string) =>
			update(history => {
				const newHistory = history.map(h =>
					h.id === id ?
						{
							...h,
							title: newTitle,
						} :
					h,
				);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
				return newHistory;
			}),
	};
}

export const historyStore = createHistoryStore();
