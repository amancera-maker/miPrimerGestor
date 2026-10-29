import { fail } from '@sveltejs/kit';
import { requireUser, requireUserAction } from '$lib/server/auth.js';
import { obtenerCarteraPendiente } from '$lib/server/finance.js';
import { enviarRecordatorioPago } from '$lib/server/email.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, depends }) {
	await requireUser(locals);
	depends('app:cobranza');
	const cartera = await obtenerCarteraPendiente();
	return { cartera };
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
async function actionEnviarRecordatorio({ request, locals }) {
	const auth = await requireUserAction(locals);
	if (!auth.ok) return fail(auth.status, { error: auth.message, message: auth.message });
	const fd = await request.formData();
	const cotizacionId = String(fd.get('cotizacionId') || '');
	const result = await enviarRecordatorioPago(cotizacionId, {
		userId: auth.user.userId,
		userName: auth.user.fullName || auth.user.email || undefined,
		userEmail: auth.user.email
	});
	if (!result.ok) return fail(400, { error: result.message, message: result.message });
	return { success: true, message: result.message || 'Recordatorio enviado' };
}

/** @type {import('./$types').Actions} */
export const actions = {
	enviarRecordatorio: actionEnviarRecordatorio,
	recordatorio: actionEnviarRecordatorio
};
