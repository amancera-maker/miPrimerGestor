import { requireUser } from '$lib/server/auth.js';
import { obtenerDashboard } from '$lib/server/finance.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	await requireUser(locals);
	try {
		const dashboard = await obtenerDashboard();
		return { dashboard };
	} catch (e) {
		logError('dashboard.load', e);
		return {
			dashboard: null,
			error: 'No se pudieron cargar los indicadores. Verifica la conexión a la base de datos.'
		};
	}
}
