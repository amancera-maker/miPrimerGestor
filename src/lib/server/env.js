import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

/**
 * Lee env de proceso con fallback a process.env (Render inyecta en runtime).
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
 * True only outside production. Bypass never activates when NODE_ENV=production.
 */
export function isDevAuthBypassAllowed() {
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
	if (!getClerkPublishableKey()) missing.push('PUBLIC_CLERK_PUBLISHABLE_KEY');
	if (!getClerkSecretKey()) missing.push('CLERK_SECRET_KEY');
	if (!getPublicOrigin()) missing.push('PUBLIC_ORIGIN');
	if (!getAuthorizedEmails()) missing.push('AUTHORIZED_EMAILS');
	if (readEnv('DEV_BYPASS_AUTH', 'private') === 'true') {
		missing.push('DEV_BYPASS_AUTH must not be true in production');
	}

	if (missing.length) return { ok: false, missing };
	return { ok: true };
}
