import { fail, redirect } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { crearCotizacion, previsualizarNumeroCotizacion } from '$lib/server/cotizaciones.js';
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
	const numeroSiguiente = await previsualizarNumeroCotizacion(today.getUTCFullYear());

	return {
		initialCliente,
		numeroSiguiente,
		defaults: {
			fecha: today.toISOString().slice(0, 10),
			vencimiento: venc.toISOString().slice(0, 10)
		}
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {FormData} fd
 * @param {boolean} enviar
 */
async function procesarGuardado({ locals }, fd, enviar) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { error: auth.message, message: auth.message });

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
		idempotencyKey,
		enviar
	});

	if (!result.ok) {
		return fail(400, {
			error: result.fieldErrors?._form || 'No se pudo guardar',
			fieldErrors: result.fieldErrors,
			values: input
		});
	}

	const q = result.avisoCorreo ? `?msg=${encodeURIComponent(result.avisoCorreo)}` : '';
	redirect(303, `/cotizaciones/${result.cotizacion.id}${q}`);
}

/** @type {import('./$types').Actions} */
export const actions = {
	guardar: async (event) => {
		const fd = await event.request.formData();
		const intent = String(fd.get('intent') || 'borrador');
		return procesarGuardado(event, fd, intent === 'enviar');
	},
	default: async (event) => {
		const fd = await event.request.formData();
		return procesarGuardado(event, fd, false);
	}
};
