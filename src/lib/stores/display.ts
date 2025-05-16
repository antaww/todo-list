import { persistentStore } from '$stores/persistent'; // Assuming persistent.ts is in $stores

const WIDE_MODE_KEY = 'wideMode';
// Default to false if not found in localStorage or for SSR
const initialWideMode = false;

// Create the persistent store for wideMode
const wideModeStore = persistentStore<boolean>(WIDE_MODE_KEY, initialWideMode);

// Export the store and a toggle function
export const displayStore = {
	subscribe: wideModeStore.subscribe,
	toggle: () => wideModeStore.update(value => !value),
	// If you need to set it directly, you can expose set as well
	// set: wideModeStore.set
};
