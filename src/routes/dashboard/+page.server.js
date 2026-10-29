import { requireUser } from '$lib/server/auth.js';
import { obtenerDashboard } from '$lib/server/finance.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, cookies, depends }) {
	await requireUser(locals);
	depends('app:dashboard');

	// Marca que el servidor aceptó la sesión (flujo login → dashboard)
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

		// Campos planos (contrato del prompt) — fuente de verdad: finance.js
		// Facturado del mes = sum(total) donde facturadaEn ∈ mes (no por estado)
		return {
			dashboard,
			totalFacturado: k.facturadoMes,
			totalCobrado: k.cobradoMes,
			carteraPendiente: k.carteraPendiente,
			cotsActivas: k.cotizacionesActivas,
			ingresosPorMes: dashboard.ingresosPorMes,
			cotsPorEstado: dashboard.porEstado,
			ultimasCots: dashboard.recientes,
			topClientes: dashboard.topClientes
		};
	} catch (e) {
		logError('dashboard.load', e);
		return {
			dashboard: null,
			totalFacturado: '0.00',
			totalCobrado: '0.00',
			carteraPendiente: '0.00',
			cotsActivas: 0,
			ingresosPorMes: [],
			cotsPorEstado: [],
			ultimasCots: [],
			topClientes: [],
			error: 'No se pudieron cargar los indicadores. Verifica la conexión a la base de datos.'
		};
	}
}
