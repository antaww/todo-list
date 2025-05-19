import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { FavoriteList } from '$stores/favorites';
import { favoritesStore } from '$stores/favorites';

const STORAGE_KEY = 'todo-list-history';
const MAX_HISTORY = 30;

function createHistoryStore() {
	const initialHistory = browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') : [];
	const store = writable<FavoriteList[]>(initialHistory);
	const {
		subscribe,
		update,
	} = store;

	// Sync store with localStorage on the client side
	if (browser) {
		store.subscribe(currentHistory => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(currentHistory));
		});
	}

	return {
		subscribe,
		add: (id: string, title: string) => {
			update(history => {
				const newHistory = [
					{
						id,
						title,
					},
					...history.filter(h => h.id !== id),
				].slice(0, MAX_HISTORY);
				return newHistory;
			});
		},
		remove: (id: string) =>
			update(history => {
				const newHistory = history.filter(h => h.id !== id);
				// localStorage update is handled by the subscribe effect above on client
				return newHistory;
			}),
		clear: () =>
			update(() => {
				// localStorage update is handled by the subscribe effect above on client
				// Ensure we return an empty array for the store state
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
				// localStorage update is handled by the subscribe effect above on client
				return newHistory;
			}),
	};
}

export const historyStore = createHistoryStore();
