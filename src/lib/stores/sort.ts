import { persistentStore } from './persistent';

export type SortByType = 'name' | 'date' | 'order' | 'difficulty';

export const sortBy = persistentStore<SortByType>('sortBy', 'order');
export const sortDirection = persistentStore<'asc' | 'desc'>('sortDirection', 'asc'); 