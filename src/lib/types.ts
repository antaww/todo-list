export interface Todo {
	completed: boolean;
	created_at: string;
	description?: string;
	difficulty: number; // 0-10, representing 0-5 stars with half-star increments
	id: string;
	list_id: string;
	order: number;
	title: string;
}
