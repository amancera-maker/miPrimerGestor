import { fail } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { obtenerCarteraPendiente } from '$lib/server/finance.js';
import { enviarRecordatorioPago } from '$lib/server/email.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	await requireUser(locals);
	const cartera = await obtenerCarteraPendiente();
	return { cartera };
}

/** @type {import('./$types').Actions} */
export const actions = {
	recordatorio: async ({ request, locals }) => {
		const auth = await requireUserAction(locals);
		if (!auth.ok) return fail(auth.status, { message: auth.message });
		const fd = await request.formData();
		const cotizacionId = String(fd.get('cotizacionId') || '');
		const result = await enviarRecordatorioPago(cotizacionId, {
			userId: auth.user.userId,
			userName: auth.user.fullName || auth.user.email || undefined
		});
		if (!result.ok) return fail(400, { message: result.message });
		return { success: true, message: 'Recordatorio enviado' };
	}
};
