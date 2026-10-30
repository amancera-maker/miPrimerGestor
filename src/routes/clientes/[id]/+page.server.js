import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { prisma } from '$lib/server/prisma.js';
import { actualizarCliente, setClienteActivo, eliminarCliente } from '$lib/server/clientes.js';
import { totalesCliente } from '$lib/server/finance.js';
import { serializeCotizacion } from '$lib/server/serialize.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, params, depends }) {
	await requireUser(locals);
	depends('app:clientes');

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
			puedeEliminar: cliente.cotizaciones.length === 0,
			cotizaciones: cliente.cotizaciones.map((c) => {
				const s = serializeCotizacion(c);
				return { ...s, totalFmt: s.total };
			})
		},
		totales
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionEditar({ request, locals, params }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const fd = await request.formData();
	const input = Object.fromEntries(fd.entries());

	const actual = await prisma.cliente.findUnique({ where: { id: params.id } });
	if (!actual) return fail(404, { errors: { _form: 'Cliente no encontrado' } });
	if (!actual.activo) {
		return fail(400, {
			errors: { _form: 'Solo se pueden editar clientes activos' },
			values: input
		});
	}

	const result = await actualizarCliente(params.id, input);
	if (!result.ok) {
		return fail(400, {
			errors: result.fieldErrors,
			fieldErrors: result.fieldErrors,
			values: input
		});
	}
	return { success: true, flash: 'Cliente actualizado' };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionDesactivar({ locals, params }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });
	const result = await setClienteActivo(params.id, false);
	if (!result.ok) return fail(400, { message: result.message });
	return { success: true, flash: 'Cliente desactivado' };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionReactivar({ locals, params }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });
	const result = await setClienteActivo(params.id, true);
	if (!result.ok) return fail(400, { message: result.message });
	return { success: true, flash: 'Cliente reactivado' };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionEliminar({ locals, params }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const result = await eliminarCliente(params.id);
	if (!result.ok) return fail(400, { message: result.message });
	redirect(303, '/clientes?msg=Cliente+eliminado');
}

/** @type {import('./$types').Actions} */
export const actions = {
	editar: actionEditar,
	desactivar: actionDesactivar,
	reactivar: actionReactivar,
	eliminar: actionEliminar,
	update: actionEditar,
	deactivate: actionDesactivar,
	reactivate: actionReactivar,
	delete: actionEliminar
};
