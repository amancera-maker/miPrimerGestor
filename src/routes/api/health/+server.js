import { json } from '@sveltejs/kit';
import { getPrisma } from '$lib/server/prisma.js';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	const ts = new Date().toISOString();
	/** @type {{ ok: boolean, service: string, ts: string, db: 'up' | 'down' | 'skipped', detail?: string }} */
	const body = {
		ok: true,
		service: 'GestorPyme',
		ts,
		db: 'skipped'
	};

	try {
		const prisma = getPrisma();
		await prisma.$queryRawUnsafe('SELECT 1');
		body.db = 'up';
	} catch (e) {
		body.ok = false;
		body.db = 'down';
		body.detail = 'Base de datos no disponible';
		return json(body, { status: 503 });
	}

	return json(body);
}
