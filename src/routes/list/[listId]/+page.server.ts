import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params }) => {
	let task = null;
	let dbError: string | null = null;

	const listId = params.listId;

	const taskId = url.searchParams.get('task_id');

	if (taskId) {
		const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
		if (uuidRegex.test(taskId)) {
			try {
				const { data: taskData, error: taskFetchError } = await supabase
					.from('todos')
					.select('id, title, difficulty, completed, description, list_id')
					.eq('id', taskId)
					.eq('list_id', listId)
					.single();

				if (taskFetchError && taskFetchError.code !== 'PGRST116') {
					console.error(`[SERVER LOAD] Error fetching task ${taskId} for list ${listId}:`, taskFetchError);
				} else if (taskData) {
					task = taskData;
				}
			} catch (e) {
				console.error(`[SERVER LOAD] Unexpected error fetching task ${taskId} for list ${listId}:`, e);
			}
		} else {
			console.warn(`[SERVER LOAD] Invalid task_id format received: ${taskId}`);
		}
	}

	try {
		const { error: healthCheckError } = await supabase
			.from('todos')
			.select('id', { count: 'exact', head: true })
			.eq('list_id', listId);

		if (healthCheckError) {
			console.error(`Database health check error for list ${listId}:`, healthCheckError);
			dbError = `Database connection error for list ${listId}: ${healthCheckError.message}. Please check server logs.`;
		}
	} catch (e: unknown) {
		console.error(`Unexpected error during database health check for list ${listId}:`, e);
		if (e instanceof Error) {
			dbError = `Database connection error: ${e.message}. Please refresh the page.`;
		} else {
			dbError = 'An unexpected database connection error occurred. Please refresh the page.';
		}
	}

	return {
		task,
		dbError,
		listId,
	};
};
