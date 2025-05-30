import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Missing Supabase environment variables');
}

// Wrap Supabase initialization in try-catch
let supabase: SupabaseClient;
try {
	supabase = createClient(supabaseUrl, supabaseKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
		},
		realtime: {
			params: {
				eventsPerSecond: 10,
			},
			reconnectAfterMs: (retries: number) => {
				// Exponential backoff starting from 1s, capped at 30s
				const backoffMs = Math.min(1000 * Math.pow(2, retries), 30000);
				return backoffMs;
			},
		},
		global: {
			headers: {
				'X-Client-Info': 'todo-app',
			},
		},
	});

	// Test the connection immediately
	void (async () => {
		try {
			await supabase
				.from('todos')
				.select('count',
					{
						count: 'exact',
						head: true,
					},
				);
			console.log('Supabase connection successful');
		} catch (err: unknown) {
			console.error('Supabase connection error:', err);
			throw err;
		}
	})();
} catch (error: unknown) {
	console.error('Failed to initialize Supabase client:', error);
	throw error;
}

export {supabase};
