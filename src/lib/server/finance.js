import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { calcularSaldo, money, toMoneyString } from './money.js';

/** Cartera: solo APROBADA puede tener saldo; FACTURADA exige cobro completo. */
export const ESTADOS_COBRANZA = /** @type {const} */ (['APROBADA']);
export const ESTADOS_ACTIVAS = /** @type {const} */ (['ENVIADA', 'APROBADA', 'PAGADA']);

/**
 * @param {{ total: any, pagos?: { monto: any }[] }} cotizacion
 * @param {{ raw?: boolean }} [opts]
 */
export function saldoDeCotizacion(cotizacion, opts = {}) {
	const saldo = calcularSaldo(
		cotizacion.total,
		(cotizacion.pagos ?? []).map((p) => p.monto)
	);
	if (opts.raw) return saldo;
	return {
		total: saldo.total,
		pagado: saldo.pagado,
		pendiente: saldo.pendiente,
		estaPagada: saldo.estaPagada
	};
}

/**
 * Cartera pendiente: APROBADA con saldo > 0
 */
export async function obtenerCarteraPendiente() {
	const rows = await prisma.cotizacion.findMany({
		where: { estado: { in: [...ESTADOS_COBRANZA] } },
		include: {
			cliente: true,
			pagos: { select: { monto: true } }
		},
		orderBy: { fecha: 'asc' }
	});

	const items = [];
	let cartera = money(0);
	const now = Date.now();

	for (const row of rows) {
		const saldo = saldoDeCotizacion(row, { raw: true });
		if (saldo.pendienteDecimal.lte(0)) continue;
		const dias = Math.floor((now - new Date(row.fecha).getTime()) / (1000 * 60 * 60 * 24));
		cartera = cartera.plus(saldo.pendienteDecimal);
		items.push({
			id: row.id,
			numero: row.numero,
			clienteId: row.clienteId,
			clienteNombre: row.cliente.nombre,
			clienteEmpresa: row.cliente.empresa,
			fecha: row.fecha,
			total: saldo.total,
			pagado: saldo.pagado,
			pendiente: saldo.pendiente,
			dias,
			alerta: dias > 30 ? 'roja' : dias >= 15 ? 'amarilla' : 'normal',
			estado: row.estado
		});
	}

	items.sort((a, b) => b.dias - a.dias);
	return { items, carteraPendiente: toMoneyString(cartera) };
}

/**
 * @param {Date} [ref]
 */
function rangoMes(ref = new Date()) {
	const y = ref.getUTCFullYear();
	const m = ref.getUTCMonth();
	const inicio = new Date(Date.UTC(y, m, 1, 0, 0, 0));
	const fin = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
	return { inicio, fin };
}

/**
 * Dashboard KPIs — una sola fuente de verdad financiera
 */
export async function obtenerDashboard() {
	const { inicio, fin } = rangoMes();
	const hace6 = new Date();
	hace6.setUTCMonth(hace6.getUTCMonth() - 5);
	hace6.setUTCDate(1);
	hace6.setUTCHours(0, 0, 0, 0);

	const [cotizadoAgg, cobradoAgg, cartera, activas, porEstado, recientes, pagos6m] = await Promise.all([
		// Cotizado del mes = suma de totales emitidos este mes (fecha de cotización)
		prisma.cotizacion.aggregate({
			_sum: { total: true },
			where: {
				fecha: { gte: inicio, lt: fin },
				estado: { not: 'RECHAZADA' }
			}
		}),
		prisma.pago.aggregate({
			_sum: { monto: true },
			where: { fecha: { gte: inicio, lt: fin } }
		}),
		// APROBADAS con saldo > 0 (pendientes de pagar)
		obtenerCarteraPendiente(),
		prisma.cotizacion.count({
			where: { estado: { in: [...ESTADOS_ACTIVAS] } }
		}),
		prisma.cotizacion.groupBy({
			by: ['estado'],
			_count: { _all: true }
		}),
		prisma.cotizacion.findMany({
			take: 5,
			orderBy: { creadoEn: 'desc' },
			include: { cliente: { select: { nombre: true } } }
		}),
		prisma.pago.findMany({
			where: { fecha: { gte: hace6 } },
			select: { fecha: true, monto: true }
		})
	]);

	/** @type {Record<string, number>} */
	const ingresosPorMes = {};
	for (let i = 0; i < 6; i++) {
		const d = new Date(Date.UTC(hace6.getUTCFullYear(), hace6.getUTCMonth() + i, 1));
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		ingresosPorMes[key] = 0;
	}
	for (const p of pagos6m) {
		const d = new Date(p.fecha);
		const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
		if (key in ingresosPorMes) {
			ingresosPorMes[key] = Number(money(ingresosPorMes[key]).plus(p.monto).toFixed(2));
		}
	}

	const topClientes = [...cartera.items]
		.reduce((/** @type {Map<string, any>} */ map, item) => {
			const cur = map.get(item.clienteId) ?? {
				clienteId: item.clienteId,
				nombre: item.clienteNombre,
				pendiente: money(0)
			};
			cur.pendiente = cur.pendiente.plus(item.pendiente);
			map.set(item.clienteId, cur);
			return map;
		}, new Map())
		.values();

	const top3 = [...topClientes]
		.sort((a, b) => b.pendiente.minus(a.pendiente).toNumber())
		.slice(0, 3)
		.map((c) => ({ ...c, pendiente: toMoneyString(c.pendiente) }));

	return {
		kpis: {
			cotizadoMes: toMoneyString(cotizadoAgg._sum.total ?? 0),
			cobradoMes: toMoneyString(cobradoAgg._sum.monto ?? 0),
			// Saldo abierto de cotizaciones APROBADAS (pendientes de pagar)
			pendientePagar: cartera.carteraPendiente,
			cotizacionesActivas: activas
		},
		ingresosPorMes: Object.entries(ingresosPorMes).map(([mes, total]) => ({ mes, total })),
		porEstado: porEstado.map((e) => ({ estado: e.estado, total: e._count._all })),
		recientes: recientes.map((c) => ({
			id: c.id,
			numero: c.numero,
			cliente: c.cliente.nombre,
			total: toMoneyString(c.total),
			estado: c.estado,
			fecha: c.fecha
		})),
		topClientes: top3
	};
}

/**
 * Totales de perfil de cliente
 * @param {string} clienteId
 */
export async function totalesCliente(clienteId) {
	const cots = await prisma.cotizacion.findMany({
		where: { clienteId },
		include: { pagos: { select: { monto: true } } }
	});
	let facturado = money(0);
	let cobrado = money(0);
	let pendiente = money(0);
	for (const c of cots) {
		if (c.facturadaEn) facturado = facturado.plus(c.total);
		const s = saldoDeCotizacion(c, { raw: true });
		cobrado = cobrado.plus(s.pagadoDecimal);
		if (ESTADOS_COBRANZA.includes(/** @type {any} */ (c.estado)) && s.pendienteDecimal.gt(0)) {
			pendiente = pendiente.plus(s.pendienteDecimal);
		}
	}
	return {
		facturado: toMoneyString(facturado),
		cobrado: toMoneyString(cobrado),
		pendiente: toMoneyString(pendiente)
	};
}

export { Prisma };
