import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth.js';
import { generarPdfCotizacion } from '$lib/server/pdf.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals, params }) {
	await requireUser(locals);
	try {
		const buffer = await generarPdfCotizacion(params.id);
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="cotizacion-${params.id}.pdf"`
			}
		});
	} catch (e) {
		logError('pdf.GET', e, { id: params.id });
		error(404, 'No se pudo generar el PDF');
	}
}
