import { redirect } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth.js';
import { isDevAuthBypassAllowed } from '$lib/server/env.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	const user = await getSessionUser(locals);
	if (user || isDevAuthBypassAllowed()) {
		redirect(303, '/dashboard');
	}
	redirect(303, '/login');
}
