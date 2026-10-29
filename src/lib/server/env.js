import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

/**
 * Lee env de servidor con fallback a process.env (Render inyecta en runtime).
 * @param {string} name
 * @param {'public' | 'private'} kind
 */
function readEnv(name, kind = 'private') {
	const fromKit = kind === 'public' ? pub[name] : env[name];
	const fromProcess = process.env[name];
	const value = (fromKit ?? fromProcess ?? '').toString().trim();
	return value;
}

export function getDatabaseUrl() {
	return readEnv('DATABASE_URL', 'private');
}

export function getClerkPublishableKey() {
	return readEnv('PUBLIC_CLERK_PUBLISHABLE_KEY', 'public');
}

export function getClerkSecretKey() {
	return readEnv('CLERK_SECRET_KEY', 'private');
}

export function getPublicOrigin() {
	return readEnv('PUBLIC_ORIGIN', 'public') || readEnv('ORIGIN', 'private');
}

export function getAuthorizedEmails() {
	return readEnv('AUTHORIZED_EMAILS', 'private');
}

/**
 * Bypass sin Clerk.
 * - Local: DEV_BYPASS_AUTH=true
 * - Render/demo sin dominio Clerk: AUTH_BYPASS=true (explícito; la URL queda abierta)
 */
export function isDevAuthBypassAllowed() {
	if (readEnv('AUTH_BYPASS', 'private') === 'true') return true;
	const nodeEnv = readEnv('NODE_ENV', 'private') || process.env.NODE_ENV || '';
	if (nodeEnv === 'production') return false;
	return readEnv('DEV_BYPASS_AUTH', 'private') === 'true';
}

/**
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function validateProductionEnv() {
	const nodeEnv = readEnv('NODE_ENV', 'private') || process.env.NODE_ENV || '';
	if (nodeEnv !== 'production') return { ok: true };

	/** @type {string[]} */
	const missing = [];
	if (!getDatabaseUrl()) missing.push('DATABASE_URL');
	if (!getPublicOrigin()) missing.push('PUBLIC_ORIGIN');

	if (isDevAuthBypassAllowed()) {
		if (missing.length) return { ok: false, missing };
		return { ok: true };
	}

	if (!getClerkPublishableKey()) missing.push('PUBLIC_CLERK_PUBLISHABLE_KEY');
	if (!getClerkSecretKey()) missing.push('CLERK_SECRET_KEY');
	if (!getAuthorizedEmails()) missing.push('AUTHORIZED_EMAILS');

	if (missing.length) return { ok: false, missing };
	return { ok: true };
}
