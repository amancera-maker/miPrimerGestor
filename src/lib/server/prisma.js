import { PrismaClient } from '@prisma/client';
import { building } from '$app/environment';

/** @type {PrismaClient | undefined} */
let client;

/**
 * Prisma 6 usa el motor nativo (no driver adapter).
 * Supabase/Render: incluir `?sslmode=require` (o `sslmode=verify-full`) en DATABASE_URL.
 * Pooler (PgBouncer transaction): preferir URL del pooler :6543 + `pgbouncer=true` si hace falta.
 * @returns {PrismaClient}
 */
export function getPrisma() {
	if (building) {
		return /** @type {PrismaClient} */ ({});
	}
	if (!client) {
		const url = process.env.DATABASE_URL ?? '';
		if (url && !/[?&]sslmode=/i.test(url) && /supabase\.co|render\.com|amazonaws\.com/i.test(url)) {
			console.warn(
				'[GestorPyme] DATABASE_URL sin sslmode. En producción use ?sslmode=require'
			);
		}
		client = new PrismaClient({
			log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
		});
	}
	return client;
}

export const prisma = new Proxy(/** @type {PrismaClient} */ ({}), {
	get(_target, prop) {
		return Reflect.get(getPrisma(), prop);
	}
});
