import { prisma } from './prisma.js';
import { money, toMoneyString } from './money.js';
import { saldoDeCotizacion, ESTADOS_COBRANZA } from './finance.js';

/**
 * @param {number} anio
 * @param {number} mes 1-12
 */
export async function reporteMensualPorCliente(anio, mes) {
	const inicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
	const fin = new Date(Date.UTC(anio, mes, 1, 0, 0, 0));

	const cots = await prisma.cotizacion.findMany({
		where: { fecha: { gte: inicio, lt: fin } },
		include: {
			cliente: { select: { id: true, nombre: true, empresa: true } },
			pagos: { select: { monto: true } }
		}
	});

	/** @type {Map<string, any>} */
	const map = new Map();
	let granTotal = money(0);

	for (const c of cots) {
		const key = c.clienteId;
		const row = map.get(key) ?? {
			clienteId: c.clienteId,
			nombre: c.cliente.nombre,
			empresa: c.cliente.empresa,
			cantidad: 0,
			total: money(0),
			cobrado: money(0),
			pendiente: money(0)
		};
		const saldo = saldoDeCotizacion(c, { raw: true });
		row.cantidad += 1;
		row.total = row.total.plus(c.total);
		row.cobrado = row.cobrado.plus(saldo.pagadoDecimal);
		if (ESTADOS_COBRANZA.includes(/** @type {any} */ (c.estado)) && saldo.pendienteDecimal.gt(0)) {
			row.pendiente = row.pendiente.plus(saldo.pendienteDecimal);
		}
		granTotal = granTotal.plus(c.total);
		map.set(key, row);
	}

	const items = [...map.values()]
		.map((r) => ({
			clienteId: r.clienteId,
			nombre: r.nombre,
			empresa: r.empresa,
			cantidad: r.cantidad,
			total: toMoneyString(r.total),
			cobrado: toMoneyString(r.cobrado),
			pendiente: toMoneyString(r.pendiente),
			porcentaje: granTotal.eq(0)
				? 0
				: Number(r.total.div(granTotal).mul(100).toFixed(2))
		}))
		.sort((a, b) => Number(b.total) - Number(a.total));

	return {
		anio,
		mes,
		granTotal: toMoneyString(granTotal),
		items
	};
}

/**
 * @param {{ items: any[], anio: number, mes: number }} reporte
 */
export function reporteToCsv(reporte) {
	const header = 'Cliente,Empresa,Cotizaciones,Total,Cobrado,Pendiente,Porcentaje\n';
	const lines = reporte.items.map((r) =>
		[
			csvEscape(r.nombre),
			csvEscape(r.empresa || ''),
			r.cantidad,
			r.total,
			r.cobrado,
			r.pendiente,
			`${r.porcentaje}%`
		].join(',')
	);
	return header + lines.join('\n');
}

/**
 * @param {string} v
 */
function csvEscape(v) {
	const s = String(v ?? '');
	if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}
