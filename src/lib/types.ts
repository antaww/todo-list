export interface Todo {
	id: string;
	list_id: string;
	title: string;
	completed: boolean;
	working: boolean;
	created_at: string;
	difficulty?: number; // 0-10, representing 0-5 stars with half-star increments
	description?: string;
	order?: number;
	assigned_to?: string;
}

export interface List {
	id: string;
	name: string;
	created_at: string;
	last_seen_at?: string;
	share_id?: string;
	shared_with_me?: boolean;
	user_id?: string;
}
