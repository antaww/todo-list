import { persistentStore } from './persistent';

export type SortByType = 'name' | 'date' | 'order';

export const sortBy = persistentStore<SortByType>('sortBy', 'order'); 