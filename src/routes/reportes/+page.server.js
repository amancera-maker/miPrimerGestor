import { requireUser } from '$lib/server/auth.js';
import { reporteMensualPorCliente, reporteToCsv } from '$lib/server/reportes.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url }) {
	await requireUser(locals);
	const now = new Date();
	const anio = Number(url.searchParams.get('anio')) || now.getUTCFullYear();
	const mes = Number(url.searchParams.get('mes')) || now.getUTCMonth() + 1;
	const reporte = await reporteMensualPorCliente(anio, mes);
	return { reporte, anio, mes };
}

/** @type {import('./$types').Actions} */
export const actions = {
	csv: async ({ request, locals }) => {
		await requireUser(locals);
		const fd = await request.formData();
		const anio = Number(fd.get('anio'));
		const mes = Number(fd.get('mes'));
		const reporte = await reporteMensualPorCliente(anio, mes);
		const csv = reporteToCsv(reporte);
		return {
			csv,
			filename: `reporte-${anio}-${String(mes).padStart(2, '0')}.csv`
		};
	}
};
