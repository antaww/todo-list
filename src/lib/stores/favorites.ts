import { writable, get } from "svelte/store";

export interface FavoriteList {
  id: string;
  title: string;
}

const STORAGE_KEY = "todo-list-favorites";

function createFavoritesStore() {
  const initialFavorites = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
  );
  const store = writable<FavoriteList[]>(initialFavorites);
  const { subscribe, update } = store;

  return {
    subscribe,
    add: (id: string, title: string) => {
      update((favorites) => {
        const newFavorites = [...favorites, { id, title }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
        return newFavorites;
      });
    },
    remove: (id: string) => {
      update((favorites) => {
        const newFavorites = favorites.filter((f) => f.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
        return newFavorites;
      });
    },
    isFavorite: (id: string) => {
      const favorites = get(store);
      return favorites.some((f) => f.id === id);
    },
    updateTitle: (id: string, newTitle: string) => {
      update((favorites) => {
        const newFavorites = favorites.map((f) => 
          f.id === id ? { ...f, title: newTitle } : f
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
        return newFavorites;
      });
    },
  };
}

export const favoritesStore = createFavoritesStore();
