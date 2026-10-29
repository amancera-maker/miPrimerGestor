import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';

/**
 * True only outside production. Bypass never activates when NODE_ENV=production.
 */
export function isDevAuthBypassAllowed() {
	if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
		return false;
	}
	return env.DEV_BYPASS_AUTH === 'true';
}

/**
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function validateProductionEnv() {
	const isProd = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
	if (!isProd) return { ok: true };

	/** @type {string[]} */
	const missing = [];
	if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
	if (!pub.PUBLIC_CLERK_PUBLISHABLE_KEY) missing.push('PUBLIC_CLERK_PUBLISHABLE_KEY');
	if (!env.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
	if (!pub.PUBLIC_ORIGIN) missing.push('PUBLIC_ORIGIN');
	if (!env.AUTHORIZED_EMAILS?.trim()) missing.push('AUTHORIZED_EMAILS');
	if (env.DEV_BYPASS_AUTH === 'true') missing.push('DEV_BYPASS_AUTH must not be true in production');

	if (missing.length) return { ok: false, missing };
	return { ok: true };
}
