import { requireUser } from '$lib/server/auth.js';
import { listarCotizaciones } from '$lib/server/cotizaciones.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	await requireUser(locals);
	const list = await listarCotizaciones(url.searchParams);
	return { list };
}
