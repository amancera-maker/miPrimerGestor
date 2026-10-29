import { requireUser } from '$lib/server/auth.js';
import { obtenerDashboard } from '$lib/server/finance.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, cookies }) {
	await requireUser(locals);
	// Marca que el servidor sí aceptó la sesión (rompe el aviso de "stuck" en /login)
	cookies.set('gestorpyme_session_ok', '1', {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24
	});
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
