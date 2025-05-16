import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';

/**
 * A store that persists to localStorage.
 */
export function persistentStore<T>(key: string, initialValue: T): Writable<T> {
	let storedValue = null;
	if (browser) {
		storedValue = localStorage.getItem(key);
	}

	let initial = initialValue;
	if (browser && storedValue !== null) { // Only try to parse if in browser and value exists
		try {
			initial = JSON.parse(storedValue);
		} catch (e) {
			console.warn(
				`Failed to parse localStorage value for key \"${key}\". Value was: \"${storedValue}\". Falling back to initial value.`,
				e
			);
			// initial remains initialValue, and persistentStore will save it in the correct format on next update.
		}
	}

	const store = writable<T>(initial);

	if (browser) {
		store.subscribe(value => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return store; // The writable store itself has subscribe, set, update
}
