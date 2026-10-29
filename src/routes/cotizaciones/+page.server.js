import { requireUser } from '$lib/server/auth.js';
import { prisma } from '$lib/server/prisma.js';
import { saldoDeCotizacion } from '$lib/server/finance.js';
import { serializeCotizacion } from '$lib/server/serialize.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, depends }) {
	await requireUser(locals);
	depends('app:cotizaciones');

	const rows = await prisma.cotizacion.findMany({
		include: {
			cliente: { select: { id: true, nombre: true, empresa: true } },
			pagos: { select: { monto: true } }
		},
		orderBy: { creadoEn: 'desc' }
	});

	const cotizaciones = rows.map((c) => {
		const saldo = saldoDeCotizacion(c);
		return {
			...serializeCotizacion(c),
			totalFmt: saldo.total,
			saldo
		};
	});

	const clientesFiltro = await prisma.cliente.findMany({
		where: { activo: true },
		select: { id: true, nombre: true },
		orderBy: { nombre: 'asc' }
	});

	return { cotizaciones, clientesFiltro };
}
