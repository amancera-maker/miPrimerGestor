import { fail, redirect } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { crearCotizacion } from '$lib/server/cotizaciones.js';
import { prisma } from '$lib/server/prisma.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	await requireUser(locals);
	const clienteId = url.searchParams.get('clienteId') || '';
	let initialCliente = null;
	if (clienteId) {
		initialCliente = await prisma.cliente.findFirst({
			where: { id: clienteId, activo: true },
			select: { id: true, nombre: true, empresa: true, rfc: true }
		});
	}
	const today = new Date();
	const venc = new Date(today);
	venc.setUTCDate(venc.getUTCDate() + 15);
	return {
		initialCliente,
		defaults: {
			fecha: today.toISOString().slice(0, 10),
			vencimiento: venc.toISOString().slice(0, 10)
		}
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });

		const fd = await request.formData();
		const idempotencyKey = String(fd.get('idempotencyKey') || '');
		/** @type {any[]} */
		const conceptos = [];
		const desc = fd.getAll('concepto_descripcion');
		const cant = fd.getAll('concepto_cantidad');
		const precio = fd.getAll('concepto_precio');
		for (let i = 0; i < desc.length; i++) {
			conceptos.push({
				descripcion: String(desc[i] ?? ''),
				cantidad: String(cant[i] ?? ''),
				precioUnitario: String(precio[i] ?? '')
			});
		}

		const input = {
			clienteId: String(fd.get('clienteId') || ''),
			fecha: String(fd.get('fecha') || ''),
			vencimiento: String(fd.get('vencimiento') || ''),
			notas: String(fd.get('notas') || ''),
			conceptos
		};

		const result = await crearCotizacion(input, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined,
			idempotencyKey
		});

		if (!result.ok) {
			return fail(400, { fieldErrors: result.fieldErrors, values: input });
		}
		redirect(303, `/cotizaciones/${result.cotizacion.id}`);
	}
};
