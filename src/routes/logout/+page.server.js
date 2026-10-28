import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		if (env.DEV_BYPASS_AUTH === 'true') {
			redirect(303, '/login');
		}
		redirect(303, '/login');
	}
};

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	redirect(303, '/login');
}
