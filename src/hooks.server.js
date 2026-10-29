import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import {
	getClerkPublishableKey,
	getClerkSecretKey,
	getPublicOrigin,
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
			sessionClaims: { email: 'amancera@utch.edu.mx', name: 'Usuario Demo' }
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

/** @type {import('@sveltejs/kit').Handle | null} */
let cachedClerkHandle = null;
/** @type {string} */
let cachedClerkKeyFingerprint = '';

/** @type {import('@sveltejs/kit').Handle} */
const clerkHandle = async (input) => {
	if (useBypass() || !clerkConfigured()) {
		return input.resolve(input.event);
	}

	const publishableKey = getClerkPublishableKey();
	const secretKey = getClerkSecretKey();
	const origin = getPublicOrigin() || 'https://miprimergestor.onrender.com';
	const fingerprint = `${publishableKey.slice(0, 12)}:${secretKey.slice(0, 12)}:${origin}`;

	if (!cachedClerkHandle || cachedClerkKeyFingerprint !== fingerprint) {
		try {
			const mod = await import('svelte-clerk/server');
			cachedClerkHandle = mod.withClerkHandler({
				secretKey,
				publishableKey,
				authorizedParties: [origin, 'https://miprimergestor.onrender.com']
			});
			cachedClerkKeyFingerprint = fingerprint;
		} catch (e) {
			console.error('[GestorPyme] No se pudo cargar svelte-clerk/server', e);
			return input.resolve(input.event);
		}
	}
	return cachedClerkHandle(input);
};

/** @type {import('@sveltejs/kit').Handle} */
const protectAuthenticated = async ({ event, resolve }) => {
	if (useBypass() || !clerkConfigured()) {
		return resolve(event);
	}
	const path = event.url.pathname;
	const auth = event.locals.auth?.() ?? { userId: null };
	const signedIn = Boolean(auth.userId);

	// No redirigir /login → /dashboard aquí: con keys de desarrollo el servidor
	// a menudo sigue "signed-out" (dev-browser-missing) y se crea un bucle infinito.
	if (!signedIn && !isPublic(path)) {
		redirect(303, '/login');
	}
	if (signedIn && path === '/') {
		redirect(303, '/dashboard');
	}
	return resolve(event);
};

export const handle = sequence(bypassOrMissingClerk, clerkHandle, protectAuthenticated);
