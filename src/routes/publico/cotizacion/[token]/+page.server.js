import { error } from '@sveltejs/kit';
import { resolverTokenPublico } from '$lib/server/tokens.js';
import { toMoneyString } from '$lib/server/money.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const cot = await resolverTokenPublico(params.token);
	if (!cot) error(404, 'Enlace no válido o expirado');
	return {
		token: params.token,
		cotizacion: {
			numero: cot.numero,
			fecha: cot.fecha,
			vencimiento: cot.vencimiento,
			subtotal: toMoneyString(cot.subtotal),
			iva: toMoneyString(cot.iva),
			total: toMoneyString(cot.total),
			notas: cot.notas,
			clienteNombre: cot.cliente.nombre,
			conceptos: cot.conceptos.map((c) => ({
				descripcion: c.descripcion,
				cantidad: c.cantidad,
				precioUnitario: toMoneyString(c.precioUnitario),
				subtotal: toMoneyString(c.subtotal)
			}))
		}
	};
}
