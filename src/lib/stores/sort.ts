import { persistentStore } from '$stores/persistent';

export type SortByType = 'order' | 'name' | 'date' | 'difficulty' | 'assigned' | 'priority';

export const sortBy = persistentStore<SortByType>('sortBy', 'order');
export const sortDirection = persistentStore<'asc' | 'desc'>('sortDirection', 'asc'); 