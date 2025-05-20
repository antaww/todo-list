import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params }) => {
	// console.log('[SERVER LOAD] Running for URL:', url.href, 'Params:', params);
	let task = null;
	let dbError: string | null = null;

	const listId = params.listId;
	// console.log('[SERVER LOAD] listId from route params:', listId);

	const taskId = url.searchParams.get('task_id');

	if (taskId) {
		// console.log('[SERVER LOAD] Found task_id in URL:', taskId);
		const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
		if (uuidRegex.test(taskId)) {
			// console.log('[SERVER LOAD] task_id is a valid UUID. Attempting to fetch...');
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
					// console.log('[SERVER LOAD] Successfully fetched task data:', task);
				} else {
					// console.log(`[SERVER LOAD] No task data found for ID ${taskId} in list ${listId} (PGRST116 or null data).`);
				}
			} catch (e) {
				console.error(`[SERVER LOAD] Unexpected error fetching task ${taskId} for list ${listId}:`, e);
			}
		} else {
			console.warn(`[SERVER LOAD] Invalid task_id format received: ${taskId}`);
		}
	} else {
		// console.log('[SERVER LOAD] No task_id found in URL query parameters. Task will remain null.');
	}

	try {
		const { error: healthCheckError } = await supabase
			.from('todos')
			.select('id', { count: 'exact', head: true })
			.eq('list_id', listId);

		if (healthCheckError) {
			console.error(`Database health check error for list ${listId}:`, healthCheckError);
			dbError = `Database connection error for list ${listId}: ${healthCheckError.message}. Please check server logs.`;
		} else {
			// const { count } = await supabase.from('todos').select('id', { count: 'exact', head: true }).eq('list_id', listId);
			// if (count === 0) console.log(`[SERVER LOAD] List ${listId} exists but is empty.`);
		}
	} catch (e: unknown) {
		console.error(`Unexpected error during database health check for list ${listId}:`, e);
		if (e instanceof Error) {
			dbError = `Database connection error: ${e.message}. Please refresh the page.`;
		} else {
			dbError = 'An unexpected database connection error occurred. Please refresh the page.';
		}
	}

	// console.log('[SERVER LOAD] Returning data:', { task, dbError, listId });
	return {
		task,
		dbError,
		listId,
	};
};
