import { json } from '@sveltejs/kit';
import { requireUserAction } from '$lib/server/auth.js';
import { buscarClientesActivos } from '$lib/server/clientes.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals, url }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return json({ message: auth.message }, { status: auth.status });
	const q = url.searchParams.get('q') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const result = await buscarClientesActivos(q, page);
	return json(result);
}
