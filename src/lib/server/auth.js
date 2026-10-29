import { redirect, error } from '@sveltejs/kit';
import { getAuthorizedEmails, isDevAuthBypassAllowed } from './env.js';

/**
 * @typedef {{ userId: string, email: string | null, fullName: string | null, imageUrl: string | null }} AppUser
 */

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

		const email =
			auth.sessionClaims?.email ||
			auth.sessionClaims?.primary_email ||
			/** @type {any} */ (auth).sessionClaims?.email_address ||
			null;

		return {
			userId: auth.userId,
			email: typeof email === 'string' ? email : null,
			fullName:
				typeof auth.sessionClaims?.name === 'string'
					? auth.sessionClaims.name
					: typeof auth.sessionClaims?.full_name === 'string'
						? /** @type {string} */ (auth.sessionClaims.full_name)
						: null,
			imageUrl: null
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
		// Sin allowlist: en bypass OK; con Clerk real se recomienda configurar
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
		error(403, 'Tu cuenta no está autorizada para acceder a este despacho.');
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
