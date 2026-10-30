import { requireUser } from '$lib/server/auth.js';
import { obtenerDashboard } from '$lib/server/finance.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, cookies, depends }) {
	await requireUser(locals);
	depends('app:dashboard');

	cookies.set('gestorpyme_session_ok', '1', {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24
	});

	try {
		const dashboard = await obtenerDashboard();
		const k = dashboard.kpis;

		return {
			dashboard,
			totalCobrado: k.cobradoMes,
			pendientePagar: k.pendientePagar,
			cotsActivas: k.cotizacionesActivas,
			cotizadoMes: k.cotizadoMes,
			ingresosPorMes: dashboard.ingresosPorMes,
			cotsPorEstado: dashboard.porEstado,
			ultimasCots: dashboard.recientes,
			topClientes: dashboard.topClientes
		};
	} catch (e) {
		logError('dashboard.load', e);
		return {
			dashboard: null,
			totalCobrado: '0.00',
			pendientePagar: '0.00',
			cotsActivas: 0,
			cotizadoMes: '0.00',
			ingresosPorMes: [],
			cotsPorEstado: [],
			ultimasCots: [],
			topClientes: [],
			error: 'No se pudieron cargar los indicadores. Verifica la conexión a la base de datos.'
		};
	}
}
