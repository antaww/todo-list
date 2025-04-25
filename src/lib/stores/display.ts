import {writable} from "svelte/store";

function createDisplayStore() {
	// Récupérer la valeur depuis le localStorage si elle existe
	const storedWideMode = localStorage.getItem("wideMode") === "true";

	const store = writable<boolean>(storedWideMode);

	// Sauvegarder dans le localStorage quand la valeur change
	store.subscribe(value => localStorage.setItem("wideMode", value.toString()));

	return {
		subscribe: store.subscribe,
		toggle: () => store.update(value => !value),
	};
}

export const displayStore = createDisplayStore();
