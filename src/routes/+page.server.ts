import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const newListId = crypto.randomUUID();
	// console.log(`[ROOT /+page.server.ts] No list specified, redirecting to /list/${newListId}`); // Removed debug log
	redirect(307, `/list/${newListId}`);
};
