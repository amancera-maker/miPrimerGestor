import { fail } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { listarClientes, crearCliente, setClienteActivo } from '$lib/server/clientes.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	await requireUser(locals);
	const list = await listarClientes(url.searchParams);
	return { list };
}

/** @type {import('./$types').Actions} */
export const actions = {
	create: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });

		const fd = await request.formData();
		const idempotencyKey = String(fd.get('idempotencyKey') || '');
		const input = Object.fromEntries(fd.entries());
		const result = await crearCliente(input, { idempotencyKey });
		if (!result.ok) {
			return fail(400, { fieldErrors: result.fieldErrors, values: input });
		}
		return { success: true, message: 'Cliente registrado exitosamente', clienteId: result.cliente.id };
	},

	deactivate: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const id = String(fd.get('id') || '');
		const result = await setClienteActivo(id, false);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Cliente desactivado' };
	},

	reactivate: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const id = String(fd.get('id') || '');
		const result = await setClienteActivo(id, true);
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Cliente reactivado' };
	}
};
