import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const newListId = crypto.randomUUID();
	redirect(307, `/list/${newListId}`);
};
