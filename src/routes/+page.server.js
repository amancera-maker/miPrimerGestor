import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSessionUser } from '$lib/server/auth.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	const user = await getSessionUser(locals);
	if (user || env.DEV_BYPASS_AUTH === 'true') {
		redirect(303, '/dashboard');
	}
	redirect(303, '/login');
}
