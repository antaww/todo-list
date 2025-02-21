import { writable } from "svelte/store";

/**
 * A store that persists to localStorage.
 */
export function persistentStore<T>(key: string, initialValue: T) {
	const storedValue = localStorage.getItem(key);
	const initial = storedValue ? JSON.parse(storedValue) : initialValue;

	const { subscribe, set } = writable<T>(initial);

	return {
		subscribe,
		set: (value: T) => {
			localStorage.setItem(key, JSON.stringify(value));
			set(value);
		}
	};
}


