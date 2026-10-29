import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	getClerkPublishableKey,
	getClerkSecretKey,
	isDevAuthBypassAllowed,
	validateProductionEnv
} from '$lib/server/env.js';

const PUBLIC_PATHS = ['/login', '/publico', '/api/health'];

/**
 * @param {string} pathname
 */
function isPublic(pathname) {
	if (pathname === '/') return true;
	return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const useBypass = () => isDevAuthBypassAllowed();
const clerkConfigured = () => Boolean(getClerkPublishableKey() && getClerkSecretKey());

const prodCheck = validateProductionEnv();
if (!prodCheck.ok) {
	console.error(
		'[GestorPyme] Variables de producción incompletas o inseguras:',
		prodCheck.missing.join(', ')
	);
}

/** @type {import('@sveltejs/kit').Handle} */
const bypassOrMissingClerk = async ({ event, resolve }) => {
	if (useBypass()) {
		event.locals.auth = () => ({
			userId: 'dev-user',
			sessionClaims: { email: 'dev@gestorpyme.local', name: 'Usuario Desarrollo' }
		});
		if (event.url.pathname === '/' || event.url.pathname === '/login') {
			redirect(303, '/dashboard');
		}
		return resolve(event);
	}

	if (!clerkConfigured()) {
		if (!isPublic(event.url.pathname) && event.url.pathname !== '/login') {
			redirect(303, '/login');
		}
		event.locals.auth = () => ({ userId: null });
		return resolve(event);
	}

	return resolve(event);
};

/** @type {import('@sveltejs/kit').Handle} */
const protectAuthenticated = async ({ event, resolve }) => {
	if (useBypass() || !clerkConfigured()) {
		return resolve(event);
	}
	const path = event.url.pathname;
	const auth = event.locals.auth?.() ?? { userId: null };
	const signedIn = Boolean(auth.userId);

	if (!signedIn && !isPublic(path)) {
		redirect(303, '/login');
	}
	if (signedIn && (path === '/login' || path === '/')) {
		redirect(303, '/dashboard');
	}
	return resolve(event);
};

/** @type {import('@sveltejs/kit').Handle} */
let clerkHandle = async ({ event, resolve }) => resolve(event);

if (!useBypass() && clerkConfigured()) {
	try {
		const mod = await import('svelte-clerk/server');
		clerkHandle = mod.withClerkHandler();
	} catch (e) {
		console.error('[GestorPyme] No se pudo cargar svelte-clerk/server', e);
	}
}

export const handle = sequence(bypassOrMissingClerk, clerkHandle, protectAuthenticated);
