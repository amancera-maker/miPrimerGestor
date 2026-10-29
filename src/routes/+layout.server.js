import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { getSessionUser, isEmailAuthorized } from '$lib/server/auth.js';
import { isDevAuthBypassAllowed } from '$lib/server/env.js';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	const user = await getSessionUser(locals);
	let clerkProps = {};
	const bypass = isDevAuthBypassAllowed();

	if (!bypass && pub.PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
		try {
			const { buildClerkProps } = await import('svelte-clerk/server');
			clerkProps = buildClerkProps(locals.auth());
		} catch {
			clerkProps = {};
		}
	}

	const authorized = user ? isEmailAuthorized(user.email) || bypass : false;

	return {
		user: user && authorized ? user : null,
		authMode: bypass ? 'bypass' : pub.PUBLIC_CLERK_PUBLISHABLE_KEY ? 'clerk' : 'unconfigured',
		...clerkProps
	};
}
