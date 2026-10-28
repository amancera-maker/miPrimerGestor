import { PrismaClient } from '@prisma/client';
import { building } from '$app/environment';

/** @type {PrismaClient | undefined} */
let client;

/**
 * @returns {PrismaClient}
 */
export function getPrisma() {
	if (building) {
		return /** @type {PrismaClient} */ ({});
	}
	if (!client) {
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
