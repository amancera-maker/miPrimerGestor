import { error, fail } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { prisma } from '$lib/server/prisma.js';
import { actualizarCliente, setClienteActivo } from '$lib/server/clientes.js';
import { totalesCliente } from '$lib/server/finance.js';
import { serializeCotizacion } from '$lib/server/serialize.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params }) {
	await requireUser(locals);
	const cliente = await prisma.cliente.findUnique({
		where: { id: params.id },
		include: {
			cotizaciones: {
				orderBy: { creadoEn: 'desc' },
				include: { pagos: { select: { monto: true } } }
			}
		}
	});
	if (!cliente) error(404, 'Cliente no encontrado');
	const totales = await totalesCliente(cliente.id);
	return {
		cliente: {
			...cliente,
			cotizaciones: cliente.cotizaciones.map((c) => {
				const s = serializeCotizacion(c);
				return { ...s, totalFmt: s.total };
			})
		},
		totales
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	update: async ({ request, locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const input = Object.fromEntries(fd.entries());
		const result = await actualizarCliente(params.id, input);
		if (!result.ok) return fail(400, { fieldErrors: result.fieldErrors, values: input });
		return { success: true, message: 'Cliente actualizado' };
	},
	deactivate: async ({ locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const result = await setClienteActivo(params.id, false);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Cliente desactivado' };
	},
	reactivate: async ({ locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const result = await setClienteActivo(params.id, true);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Cliente reactivado' };
	}
};
