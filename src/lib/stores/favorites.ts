import { browser } from '$app/environment';
import { get, writable } from "svelte/store";

export interface FavoriteList {
	id: string;
	title: string;
}

const STORAGE_KEY = "todo-list-favorites";

function createFavoritesStore() {
	const initialFavorites = browser ? JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") : [];
	const store = writable<FavoriteList[]>(initialFavorites);
	const {
		subscribe,
		update,
	} = store;

	// Sync store with localStorage on the client side
	if (browser) {
		store.subscribe(currentFavorites => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(currentFavorites));
		});
	}

	return {
		subscribe,
		add: (id: string, title: string) =>
			update(favorites => {
				const newFavorites = [
					...favorites,
					{
						id,
						title,
					},
				];
				// localStorage update is handled by the subscribe effect above on client
				return newFavorites;
			}),
		remove: (id: string) =>
			update(favorites => {
				const newFavorites = favorites.filter(f => f.id !== id);
				// localStorage update is handled by the subscribe effect above on client
				return newFavorites;
			}),
		isFavorite: (id: string) => {
			const favorites = get(store);
			return favorites.some(f => f.id === id);
		},
		updateTitle: (id: string, newTitle: string) =>
			update(favorites => {
				const newFavorites = favorites.map(f =>
					f.id === id ?
						{
							...f,
							title: newTitle,
						} :
					f,
				);
				// localStorage update is handled by the subscribe effect above on client
				return newFavorites;
			}),
	};
}

export const favoritesStore = createFavoritesStore();
