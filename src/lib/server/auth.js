import { redirect, error } from '@sveltejs/kit';
import { createClerkClient } from '@clerk/backend';
import { getAuthorizedEmails, getClerkSecretKey, isDevAuthBypassAllowed } from './env.js';

/**
 * @typedef {{ userId: string, email: string | null, fullName: string | null, imageUrl: string | null }} AppUser
 */

/**
 * Extrae email de sessionClaims (Clerk no siempre lo incluye por defecto).
 * @param {Record<string, unknown> | null | undefined} claims
 */
function emailFromClaims(claims) {
	if (!claims || typeof claims !== 'object') return null;
	const candidates = [
		claims.email,
		claims.primary_email,
		claims.email_address,
		claims.primary_email_address
	];
	for (const c of candidates) {
		if (typeof c === 'string' && c.includes('@')) return c;
	}
	return null;
}

/**
 * @param {string} userId
 * @returns {Promise<{ email: string | null, fullName: string | null, imageUrl: string | null }>}
 */
async function fetchClerkProfile(userId) {
	const secret = getClerkSecretKey();
	if (!secret) return { email: null, fullName: null, imageUrl: null };
	try {
		const client = createClerkClient({ secretKey: secret });
		const user = await client.users.getUser(userId);
		const primary =
			user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId) ||
			user.emailAddresses?.[0];
		const email = primary?.emailAddress ?? null;
		const fullName =
			[user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
			user.username ||
			null;
		return {
			email,
			fullName,
			imageUrl: user.imageUrl ?? null
		};
	} catch (e) {
		console.error('[GestorPyme] No se pudo leer el perfil de Clerk', e);
		return { email: null, fullName: null, imageUrl: null };
	}
}

/**
 * @param {App.Locals} locals
 * @returns {Promise<AppUser | null>}
 */
export async function getSessionUser(locals) {
	if (isDevAuthBypassAllowed()) {
		return {
			userId: 'dev-user',
			email: 'dev@gestorpyme.local',
			fullName: 'Usuario Desarrollo',
			imageUrl: null
		};
	}

	try {
		const auth = locals.auth?.();
		if (!auth?.userId) return null;

		/** @type {Record<string, unknown> | undefined} */
		const claims = /** @type {any} */ (auth).sessionClaims;
		let email = emailFromClaims(claims);
		let fullName =
			typeof claims?.name === 'string'
				? claims.name
				: typeof claims?.full_name === 'string'
					? /** @type {string} */ (claims.full_name)
					: null;
		/** @type {string | null} */
		let imageUrl = null;

		if (!email) {
			const profile = await fetchClerkProfile(auth.userId);
			email = profile.email;
			fullName = fullName || profile.fullName;
			imageUrl = profile.imageUrl;
		}

		return {
			userId: auth.userId,
			email,
			fullName,
			imageUrl
		};
	} catch {
		return null;
	}
}

/**
 * @param {string | null | undefined} email
 */
export function isEmailAuthorized(email) {
	const raw = getAuthorizedEmails();
	if (!raw) {
		return true;
	}
	if (!email) return false;
	const allowed = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
	return allowed.includes(email.toLowerCase());
}

/**
 * @param {App.Locals} locals
 * @returns {Promise<AppUser>}
 */
export async function requireUser(locals) {
	const user = await getSessionUser(locals);
	if (!user) {
		redirect(303, '/login');
	}
	if (!isEmailAuthorized(user.email) && !isDevAuthBypassAllowed()) {
		redirect(303, '/login?error=unauthorized');
	}
	return user;
}

/**
 * @param {App.Locals} locals
 */
export async function requireUserAction(locals) {
	const user = await getSessionUser(locals);
	if (!user) {
		return { ok: false, status: 401, message: 'Debes iniciar sesión para continuar.' };
	}
	if (!isEmailAuthorized(user.email) && !isDevAuthBypassAllowed()) {
		return { ok: false, status: 403, message: 'Tu cuenta no está autorizada para este despacho.' };
	}
	return { ok: true, user };
}
