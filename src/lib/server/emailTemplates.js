/**
 * Templates HTML para Resend (strings puros — sin Svelte).
 */

/**
 * @param {unknown} n
 */
function formatMXN(n) {
	const num = typeof n === 'number' ? n : Number(n);
	return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
		Number.isFinite(num) ? num : 0
	);
}

/**
 * @param {unknown} s
 */
function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param {{
 *   cliente: { nombre: string },
 *   cotizacion: { numero: string, subtotal: any, iva: any, total: any, vencimiento?: any, notas?: string | null },
 *   conceptos: { descripcion: string, cantidad: number, precioUnitario: any, subtotal: any }[],
 *   linkPublico?: string | null,
 *   linkPdf?: string | null,
 *   despachoNombre?: string
 * }} params
 */
export function templateCotizacionEnviada({
	cliente,
	cotizacion,
	conceptos,
	linkPublico = null,
	linkPdf = null,
	despachoNombre = 'Despacho'
}) {
	const filasConceptos = conceptos
		.map(
			(c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(c.descripcion)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${escapeHtml(c.cantidad)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMXN(c.precioUnitario)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMXN(c.subtotal)}</td>
    </tr>`
		)
		.join('');

	const vencimientoHtml = cotizacion.vencimiento
		? `<p style="color:#6b7280;font-size:13px;margin-top:16px;">Esta cotización tiene vigencia hasta el <strong>${new Date(
				cotizacion.vencimiento
			).toLocaleDateString('es-MX')}</strong>.</p>`
		: '';

	const notasHtml = cotizacion.notas
		? `<div style="background:#f9fafb;border-left:3px solid #0f3d2e;padding:12px 16px;margin-top:16px;"><p style="margin:0;font-size:13px;color:#374151;">${escapeHtml(
				cotizacion.notas
			)}</p></div>`
		: '';

	const botones = [];
	if (linkPublico) {
		botones.push(
			`<a href="${escapeHtml(
				linkPublico
			)}" style="display:inline-block;background:#0f3d2e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin:4px;">Ver cotización en línea</a>`
		);
	}
	if (linkPdf) {
		botones.push(
			`<a href="${escapeHtml(
				linkPdf
			)}" style="display:inline-block;background:#ffffff;color:#0f3d2e;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;margin:4px;border:2px solid #0f3d2e;">Descargar PDF</a>`
		);
	}
	const linkHtml = botones.length
		? `<p style="margin-top:24px;text-align:center;">${botones.join('')}</p>`
		: '';

	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0f3d2e;padding:24px 32px;">
      <p style="color:#a7f3d0;margin:0 0 4px;font-size:12px;">${escapeHtml(despachoNombre)}</p>
      <h1 style="color:#ffffff;margin:0;font-size:22px;">Cotización ${escapeHtml(cotizacion.numero)}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:15px;">Estimado/a <strong>${escapeHtml(cliente.nombre)}</strong>,</p>
      <p style="color:#374151;font-size:15px;">Le enviamos la cotización <strong>${escapeHtml(
				cotizacion.numero
			)}</strong> con el siguiente desglose de servicios:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;">Descripción</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;">Cant.</th>
            <th style="padding:10px 12px;text-align:right;color:#6b7280;">Precio Unit.</th>
            <th style="padding:10px 12px;text-align:right;color:#6b7280;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filasConceptos}</tbody>
      </table>
      <div style="text-align:right;margin-top:16px;padding:16px;background:#ecfdf5;border-radius:6px;">
        <p style="margin:4px 0;color:#6b7280;font-size:13px;">Subtotal: ${formatMXN(cotizacion.subtotal)}</p>
        <p style="margin:4px 0;color:#6b7280;font-size:13px;">IVA (16%): ${formatMXN(cotizacion.iva)}</p>
        <p style="margin:0;color:#0f3d2e;font-size:20px;font-weight:bold;">Total: ${formatMXN(
					cotizacion.total
				)}</p>
      </div>
      ${vencimientoHtml}
      ${notasHtml}
      ${linkHtml}
    </div>
    <div style="background:#f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center;">
      <p style="margin:0;">Para cualquier duda, contáctenos al correo o teléfono del despacho.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {{
 *   cliente: { nombre: string },
 *   cotizacion: { numero: string },
 *   saldoPendiente: any,
 *   datosTransferencia?: string | null,
 *   despachoNombre?: string
 * }} params
 */
export function templateRecordatorioPago({
	cliente,
	cotizacion,
	saldoPendiente,
	datosTransferencia = null,
	despachoNombre = 'Despacho'
}) {
	const transferenciaHtml = datosTransferencia
		? `<p style="color:#374151;font-size:14px;margin-top:16px;"><strong>Datos de transferencia:</strong><br>${escapeHtml(
				datosTransferencia
			)}</p>`
		: '';

	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#1F2937;padding:24px 32px;">
      <p style="color:#9ca3af;margin:0 0 4px;font-size:12px;">${escapeHtml(despachoNombre)}</p>
      <h1 style="color:#ffffff;margin:0;font-size:20px;">Recordatorio de pago</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;">Estimado/a <strong>${escapeHtml(cliente.nombre)}</strong>,</p>
      <p style="color:#374151;">Le recordamos que tiene un saldo pendiente correspondiente a la cotización <strong>${escapeHtml(
				cotizacion.numero
			)}</strong>.</p>
      <div style="text-align:center;padding:24px;background:#fef3c7;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;">Saldo pendiente</p>
        <p style="margin:8px 0 0;color:#92400e;font-size:28px;font-weight:bold;">${formatMXN(
					saldoPendiente
				)}</p>
      </div>
      ${transferenciaHtml}
      <p style="color:#374151;font-size:14px;">Para cualquier aclaración, no dude en contactarnos. Agradecemos su preferencia.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {{
 *   cliente: { nombre: string },
 *   cotizacion: { numero: string, total: any },
 *   despachoNombre?: string
 * }} params
 */
export function templateCotizacionAprobada({
	cliente,
	cotizacion,
	despachoNombre = 'Despacho'
}) {
	return `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <div style="background:#065f46;padding:24px 32px;">
      <p style="color:#a7f3d0;margin:0 0 4px;font-size:12px;">${escapeHtml(despachoNombre)}</p>
      <h1 style="color:#ffffff;margin:0;font-size:20px;">Cotización aprobada</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;">Hola <strong>${escapeHtml(cliente.nombre)}</strong>,</p>
      <p style="color:#374151;">¡Buenas noticias! Su cotización <strong>${escapeHtml(
				cotizacion.numero
			)}</strong> ha sido aprobada.</p>
      <p style="color:#374151;">Total acordado: <strong>${formatMXN(cotizacion.total)}</strong></p>
      <p style="color:#6b7280;font-size:13px;">Pronto nos pondremos en contacto para los siguientes pasos.</p>
    </div>
  </div>
</body>
</html>`;
}
