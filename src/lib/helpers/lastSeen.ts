import { persistentStore } from "../stores/persistent";


const STORAGE_KEY = 'todo-list-lastSeen';

export const lastSeenStore = persistentStore<number>(STORAGE_KEY, 0);

export function startLastSeenTracking() {
	let interval: NodeJS.Timeout | null = null;

	const updateLastSeen = () => {
		lastSeenStore.set(Date.now());
	};

	const startInterval = () => {
		if (!interval) {
			interval = setInterval(updateLastSeen, 1000);
		}
	};

	const stopInterval = () => {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	};

	// Gérer le changement de visibilité
	const handleVisibilityChange = () => {
		if (document.visibilityState === 'hidden') {
			updateLastSeen();
			stopInterval();
		} else {
			updateLastSeen();
			startInterval();
		}
	};

	// Démarrer l'interval initial
	startInterval();
	document.addEventListener('visibilitychange', handleVisibilityChange);

	// Cleanup function
	return () => {
		stopInterval();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	};
}