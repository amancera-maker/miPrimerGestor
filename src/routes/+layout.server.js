import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { getSessionUser, isEmailAuthorized } from '$lib/server/auth.js';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	const user = await getSessionUser(locals);
	let clerkProps = {};

	if (env.DEV_BYPASS_AUTH !== 'true' && pub.PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY) {
		try {
			const { buildClerkProps } = await import('svelte-clerk/server');
			clerkProps = buildClerkProps(locals.auth());
		} catch {
			clerkProps = {};
		}
	}

	const authorized = user ? isEmailAuthorized(user.email) || env.DEV_BYPASS_AUTH === 'true' : false;

	return {
		user: user && authorized ? user : null,
		authMode: env.DEV_BYPASS_AUTH === 'true' ? 'bypass' : pub.PUBLIC_CLERK_PUBLISHABLE_KEY ? 'clerk' : 'unconfigured',
		...clerkProps
	};
}
