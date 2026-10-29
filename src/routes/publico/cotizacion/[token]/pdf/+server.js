import { error } from '@sveltejs/kit';
import { resolverTokenPublico } from '$lib/server/tokens.js';
import { generarPdfCotizacion } from '$lib/server/pdf.js';
import { logError } from '$lib/server/logger.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	const cot = await resolverTokenPublico(params.token);
	if (!cot) error(404, 'Enlace no válido o expirado');

	try {
		const buffer = await generarPdfCotizacion(cot.id);
		const safeName = String(cot.numero || cot.id).replace(/[^\w.-]+/g, '_');
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="cotizacion-${safeName}.pdf"`,
				'Cache-Control': 'private, no-store'
			}
		});
	} catch (e) {
		logError('publico.pdf.GET', e, { token: params.token.slice(0, 8) });
		error(500, 'No se pudo generar el PDF');
	}
}
