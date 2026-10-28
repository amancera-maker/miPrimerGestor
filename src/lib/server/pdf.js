import PDFDocument from 'pdfkit';
import { env } from '$env/dynamic/private';
import { prisma } from './prisma.js';
import { formatMXN } from '../format.js';
import { formatFecha } from '../format.js';

/**
 * @param {string} cotizacionId
 * @returns {Promise<Buffer>}
 */
export async function generarPdfCotizacion(cotizacionId) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: {
			cliente: true,
			conceptos: { orderBy: { orden: 'asc' } }
		}
	});
	if (!cot) throw new Error('Cotización no encontrada');

	const cfg = await prisma.configDespacho.findUnique({ where: { id: 'default' } });
	const despacho = {
		nombre: cfg?.nombre || env.DESPACHO_NOMBRE || 'Despacho',
		rfc: cfg?.rfc || env.DESPACHO_RFC || '',
		direccion: cfg?.direccion || env.DESPACHO_DIRECCION || '',
		telefono: cfg?.telefono || env.DESPACHO_TELEFONO || '',
		correo: cfg?.correo || env.DESPACHO_CORREO || ''
	};

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
		/** @type {Buffer[]} */
		const chunks = [];
		doc.on('data', (c) => chunks.push(c));
		doc.on('end', () => resolve(Buffer.concat(chunks)));
		doc.on('error', reject);

		doc.fillColor('#0f3d2e').fontSize(20).text(despacho.nombre, { align: 'left' });
		doc.fillColor('#4b5563').fontSize(10);
		if (despacho.rfc) doc.text(`RFC: ${despacho.rfc}`);
		if (despacho.direccion) doc.text(despacho.direccion);
		if (despacho.telefono || despacho.correo) {
			doc.text([despacho.telefono, despacho.correo].filter(Boolean).join(' · '));
		}

		doc.moveDown();
		doc.fillColor('#0f3d2e').fontSize(16).text('COTIZACIÓN', { align: 'right' });
		doc.fillColor('#111827').fontSize(11).text(cot.numero, { align: 'right' });
		doc.fontSize(10).fillColor('#4b5563');
		doc.text(`Emisión: ${formatFecha(cot.fecha)}`, { align: 'right' });
		doc.text(`Vencimiento: ${formatFecha(cot.vencimiento)}`, { align: 'right' });

		doc.moveDown();
		doc.fillColor('#0f3d2e').fontSize(12).text('Cliente');
		doc.fillColor('#111827').fontSize(11).text(cot.cliente.nombre);
		if (cot.cliente.empresa) doc.fontSize(10).fillColor('#4b5563').text(cot.cliente.empresa);
		if (cot.cliente.rfc) doc.text(`RFC: ${cot.cliente.rfc}`);
		if (cot.cliente.correo) doc.text(cot.cliente.correo);

		doc.moveDown();
		const tableTop = doc.y;
		const cols = [50, 280, 340, 420, 500];
		doc.fillColor('#0f3d2e').fontSize(10).text('Descripción', cols[0], tableTop);
		doc.text('Cant.', cols[1], tableTop);
		doc.text('P. unit.', cols[2], tableTop);
		doc.text('Importe', cols[3], tableTop);
		doc
			.moveTo(50, tableTop + 14)
			.lineTo(560, tableTop + 14)
			.strokeColor('#0f3d2e')
			.stroke();

		let y = tableTop + 22;
		doc.fillColor('#111827');
		for (const c of cot.conceptos) {
			doc.fontSize(10).text(c.descripcion, cols[0], y, { width: 220 });
			doc.text(String(c.cantidad), cols[1], y);
			doc.text(formatMXN(c.precioUnitario), cols[2], y);
			doc.text(formatMXN(c.subtotal), cols[3], y);
			y = Math.max(y + 18, doc.y + 6);
			if (y > 700) {
				doc.addPage();
				y = 50;
			}
		}

		y += 10;
		doc
			.moveTo(320, y)
			.lineTo(560, y)
			.strokeColor('#d1d5db')
			.stroke();
		y += 10;
		doc.fontSize(10).fillColor('#4b5563').text('Subtotal', 340, y);
		doc.fillColor('#111827').text(formatMXN(cot.subtotal), 420, y);
		y += 16;
		doc.fillColor('#4b5563').text('IVA 16%', 340, y);
		doc.fillColor('#111827').text(formatMXN(cot.iva), 420, y);
		y += 18;
		doc.fontSize(12).fillColor('#0f3d2e').text('Total', 340, y);
		doc.text(formatMXN(cot.total), 420, y);

		if (cot.notas) {
			y += 40;
			doc.fontSize(11).fillColor('#0f3d2e').text('Notas', 50, y);
			doc.fontSize(10).fillColor('#4b5563').text(cot.notas, 50, y + 16, { width: 500 });
		}

		doc.end();
	});
}
