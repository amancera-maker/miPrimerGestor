import { fail } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { prisma } from '$lib/server/prisma.js';
import { crearCliente, actualizarCliente, setClienteActivo } from '$lib/server/clientes.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, depends, url }) {
	await requireUser(locals);
	depends('app:clientes');

	const mostrarInactivos = url.searchParams.get('inactivos') === '1';
	const clientes = await prisma.cliente.findMany({
		where: mostrarInactivos ? undefined : { activo: true },
		orderBy: [{ activo: 'desc' }, { creadoEn: 'desc' }]
	});

	return { clientes, mostrarInactivos };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionCrear({ request, locals }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const fd = await request.formData();
	const idempotencyKey = String(fd.get('idempotencyKey') || '');
	const input = Object.fromEntries(fd.entries());
	const result = await crearCliente(input, { idempotencyKey });
	if (!result.ok) {
		return fail(400, {
			errors: result.fieldErrors,
			fieldErrors: result.fieldErrors,
			values: input
		});
	}
	return {
		success: true,
		flash: result.idempotent ? 'Cliente ya registrado (envío duplicado ignorado)' : 'Cliente registrado exitosamente',
		clienteId: result.cliente.id
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionEditar({ request, locals }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const fd = await request.formData();
	const id = String(fd.get('id') || '');
	const input = Object.fromEntries(fd.entries());
	if (!id) {
		return fail(400, { errors: { _form: 'Cliente no indicado' }, values: input });
	}

	const actual = await prisma.cliente.findUnique({ where: { id } });
	if (!actual) return fail(404, { errors: { _form: 'Cliente no encontrado' } });
	if (!actual.activo) {
		return fail(400, {
			errors: { _form: 'Solo se pueden editar clientes activos. Reactívalo primero.' },
			values: input
		});
	}

	const result = await actualizarCliente(id, input);
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
async function actionDesactivar({ request, locals }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const fd = await request.formData();
	const id = String(fd.get('id') || '');
	const result = await setClienteActivo(id, false);
	if (!result.ok) return fail(400, { message: result.message });
	return { success: true, flash: 'Cliente desactivado' };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionReactivar({ request, locals }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { message: auth.message });

	const fd = await request.formData();
	const id = String(fd.get('id') || '');
	const result = await setClienteActivo(id, true);
	if (!result.ok) return fail(400, { message: result.message });
	return { success: true, flash: 'Cliente reactivado' };
}

/** @type {import('./$types').Actions} */
export const actions = {
	crear: actionCrear,
	editar: actionEditar,
	desactivar: actionDesactivar,
	reactivar: actionReactivar,
	create: actionCrear,
	deactivate: actionDesactivar
};
