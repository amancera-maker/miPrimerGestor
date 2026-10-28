import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

const PUBLIC_PATHS = ['/login', '/publico', '/api/health'];

/**
 * @param {string} pathname
 */
function isPublic(pathname) {
	if (pathname === '/') return true;
	return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const useBypass = () => env.DEV_BYPASS_AUTH === 'true';
const clerkConfigured = () =>
	Boolean(pub.PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);

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
