import { getSessionUser, isEmailAuthorized } from '$lib/server/auth.js';
import {
	getClerkPublishableKey,
	getClerkSecretKey,
	isDevAuthBypassAllowed
} from '$lib/server/env.js';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
	const user = await getSessionUser(locals);
	let clerkProps = {};
	const bypass = isDevAuthBypassAllowed();
	const publishable = getClerkPublishableKey();
	const secret = getClerkSecretKey();

	if (!bypass && publishable && secret) {
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
		authMode: bypass ? 'bypass' : publishable ? 'clerk' : 'unconfigured',
		...clerkProps
	};
}
