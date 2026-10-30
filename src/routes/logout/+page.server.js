import { redirect } from '@sveltejs/kit';

/**
 * Fallback server-side. El cierre real de Clerk ocurre en el cliente
 * (LogoutButton / SignOutButton). Aquí solo redirigimos.
 */

/** @type {import('./$types').Actions} */
export const actions = {
	default: async () => {
		redirect(303, '/login?signedOut=1');
	}
};

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	redirect(303, '/login?signedOut=1');
}
