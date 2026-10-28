import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import {
	obtenerCotizacion,
	cambiarEstado,
	reabrirComoBorrador,
	actualizarBorrador
} from '$lib/server/cotizaciones.js';
import { registrarPago, eliminarPago } from '$lib/server/pagos.js';
import { enviarCorreoCotizacion } from '$lib/server/email.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params, url }) {
	await requireUser(locals);
	const cotizacion = await obtenerCotizacion(params.id);
	if (!cotizacion) error(404, 'Cotización no encontrada');
	return {
		cotizacion,
		flash: url.searchParams.get('msg') || null
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	estado: async ({ request, locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const nuevo = String(fd.get('estado') || '');
		const motivo = String(fd.get('motivo') || '');
		const result = await cambiarEstado(params.id, nuevo, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined,
			motivo
		});
		if (!result.ok) return fail(400, { message: result.message });
		return {
			success: true,
			message: result.avisoCorreo || 'Estado actualizado',
			warning: Boolean(result.avisoCorreo)
		};
	},

	reabrir: async ({ request, locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const motivo = String(fd.get('motivo') || '');
		const result = await reabrirComoBorrador(params.id, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined,
			motivo
		});
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Cotización reabierta como borrador' };
	},

	update: async ({ request, locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
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
		const result = await actualizarBorrador(params.id, input);
		if (!result.ok) return fail(400, { fieldErrors: result.fieldErrors, values: input });
		return { success: true, message: 'Borrador actualizado' };
	},

	pago: async ({ request, locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const input = {
			monto: String(fd.get('monto') || ''),
			fecha: String(fd.get('fecha') || ''),
			metodo: String(fd.get('metodo') || ''),
			referencia: String(fd.get('referencia') || ''),
			idempotencyKey: String(fd.get('idempotencyKey') || '')
		};
		const result = await registrarPago(params.id, input, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined
		});
		if (!result.ok) return fail(400, { fieldErrors: result.fieldErrors, pagoValues: input });
		return { success: true, message: 'Pago registrado' };
	},

	eliminarPago: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const pagoId = String(fd.get('pagoId') || '');
		const result = await eliminarPago(pagoId, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined
		});
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Pago eliminado' };
	},

	reenviarCorreo: async ({ locals, params }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const result = await enviarCorreoCotizacion(params.id);
		if (!result.ok) return fail(400, { message: 'No se pudo enviar el correo. Intenta nuevamente.' });
		return { success: true, message: 'Correo reenviado' };
	}
};
