import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { prisma } from './prisma.js';
import { formatMXN } from './money.js';
import { crearTokenPublico } from './tokens.js';
import { logError, logInfo } from './logger.js';
import { getMailerOverride } from './mailer.js';

/**
 * @returns {import('./mailer.js').Mailer | null}
 */
function getMailer() {
	const override = getMailerOverride();
	if (override) return override;
	if (!env.RESEND_API_KEY) return null;
	const resend = new Resend(env.RESEND_API_KEY);
	return {
		async send(payload) {
			const result = await resend.emails.send(payload);
			if (result.error) return { ok: false, error: result.error };
			return { ok: true, id: result.data?.id || undefined };
		}
	};
}

async function getDespacho() {
	const cfg = await prisma.configDespacho.findUnique({ where: { id: 'default' } });
	return {
		nombre: cfg?.nombre || env.DESPACHO_NOMBRE || 'Despacho',
		rfc: cfg?.rfc || env.DESPACHO_RFC || '',
		telefono: cfg?.telefono || env.DESPACHO_TELEFONO || '',
		correo: cfg?.correo || env.DESPACHO_CORREO || '',
		direccion: cfg?.direccion || env.DESPACHO_DIRECCION || '',
		transferencia: cfg?.datosTransferencia || env.DESPACHO_TRANSFERENCIA || ''
	};
}

/**
 * @param {string} cotizacionId
 */
export async function enviarCorreoCotizacion(cotizacionId) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: { cliente: true, conceptos: { orderBy: { orden: 'asc' } } }
	});
	if (!cot) return { ok: false };

	const notif = await prisma.notificacion.create({
		data: {
			cotizacionId,
			tipo: 'COTIZACION_ENVIADA',
			estado: 'ENVIANDO',
			destinatario: cot.cliente.correo,
			asunto: `Cotización ${cot.numero}`
		}
	});

	const mailer = getMailer();
	if (!mailer) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'FALLIDA', errorTecnico: 'RESEND_API_KEY no configurada' }
		});
		logError('enviarCorreoCotizacion', 'RESEND_API_KEY ausente', { cotizacionId });
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}

	try {
		const token = await crearTokenPublico(cotizacionId);
		const origin = pub.PUBLIC_ORIGIN || 'http://localhost:5173';
		const link = `${origin}/publico/cotizacion/${token}`;
		const despacho = await getDespacho();
		const conceptosHtml = cot.conceptos
			.map(
				(c) =>
					`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(c.descripcion)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${c.cantidad}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMXN(c.precioUnitario)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatMXN(c.subtotal)}</td></tr>`
			)
			.join('');

		const html = `
		<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto">
			<h1 style="color:#0f3d2e">${escapeHtml(despacho.nombre)}</h1>
			<p>Hola ${escapeHtml(cot.cliente.nombre)},</p>
			<p>Te compartimos la cotización <strong>${escapeHtml(cot.numero)}</strong>.</p>
			<table style="width:100%;border-collapse:collapse;margin:16px 0">
				<thead><tr>
					<th style="text-align:left;padding:8px;border-bottom:2px solid #0f3d2e">Concepto</th>
					<th style="text-align:right;padding:8px;border-bottom:2px solid #0f3d2e">Cant.</th>
					<th style="text-align:right;padding:8px;border-bottom:2px solid #0f3d2e">P. unit.</th>
					<th style="text-align:right;padding:8px;border-bottom:2px solid #0f3d2e">Importe</th>
				</tr></thead>
				<tbody>${conceptosHtml}</tbody>
			</table>
			<p style="font-size:18px"><strong>Total: ${formatMXN(cot.total)}</strong></p>
			<p><a href="${link}" style="display:inline-block;background:#0f3d2e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Ver cotización</a></p>
			<p style="color:#6b7280;font-size:13px">${escapeHtml(despacho.direccion)} · ${escapeHtml(despacho.telefono)} · ${escapeHtml(despacho.correo)}</p>
		</div>`;

		const result = await mailer.send({
			from: env.FROM_EMAIL || 'onboarding@resend.dev',
			to: cot.cliente.correo,
			subject: `Cotización ${cot.numero} — ${despacho.nombre}`,
			html
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			logError('enviarCorreoCotizacion', result.error, { cotizacionId });
			return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'ACEPTADA_POR_PROVEEDOR',
				proveedorId: result.id || null
			}
		});
		await prisma.historialCot.create({
			data: {
				cotizacionId,
				estadoAnterior: cot.estado,
				estadoNuevo: cot.estado,
				nota: 'Correo de cotización aceptado por el proveedor (entrega al destinatario no confirmada)'
			}
		});
		logInfo('correo_enviada_ok', { cotizacionId, notifId: notif.id });
		return { ok: true };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'FALLIDA',
				errorTecnico: e instanceof Error ? e.message : String(e)
			}
		});
		logError('enviarCorreoCotizacion', e, { cotizacionId });
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}
}

/**
 * @param {string} cotizacionId
 */
export async function enviarCorreoAprobacion(cotizacionId) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: { cliente: true }
	});
	if (!cot) return { ok: false };

	const notif = await prisma.notificacion.create({
		data: {
			cotizacionId,
			tipo: 'COTIZACION_APROBADA',
			estado: 'ENVIANDO',
			destinatario: cot.cliente.correo,
			asunto: `Cotización ${cot.numero} aprobada`
		}
	});

	const mailer = getMailer();
	if (!mailer) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'FALLIDA', errorTecnico: 'RESEND_API_KEY no configurada' }
		});
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}

	try {
		const despacho = await getDespacho();
		const html = `
		<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto">
			<h1 style="color:#0f3d2e">${escapeHtml(despacho.nombre)}</h1>
			<p>Hola ${escapeHtml(cot.cliente.nombre)},</p>
			<p>¡Buenas noticias! Tu cotización <strong>${escapeHtml(cot.numero)}</strong> ha sido aprobada y tu proyecto está en marcha.</p>
			<p>Total acordado: <strong>${formatMXN(cot.total)}</strong></p>
			<p>Pronto nos pondremos en contacto contigo para los siguientes pasos.</p>
			<p style="color:#6b7280;font-size:13px">${escapeHtml(despacho.correo)} · ${escapeHtml(despacho.telefono)}</p>
		</div>`;

		const result = await mailer.send({
			from: env.FROM_EMAIL || 'onboarding@resend.dev',
			to: cot.cliente.correo,
			subject: `Tu cotización ${cot.numero} fue aprobada`,
			html
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			logError('enviarCorreoAprobacion', result.error, { cotizacionId });
			return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'ACEPTADA_POR_PROVEEDOR', proveedorId: result.id || null }
		});
		return { ok: true };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'FALLIDA', errorTecnico: e instanceof Error ? e.message : String(e) }
		});
		logError('enviarCorreoAprobacion', e, { cotizacionId });
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}
}

/**
 * @param {string} cotizacionId
 * @param {{ userId?: string, userName?: string }} meta
 */
export async function enviarRecordatorioPago(cotizacionId, meta = {}) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: { cliente: true, pagos: true }
	});
	if (!cot) return { ok: false, message: 'Cotización no encontrada' };
	if (!['APROBADA', 'FACTURADA'].includes(cot.estado)) {
		return { ok: false, message: 'Solo se pueden recordar cotizaciones con saldo pendiente.' };
	}

	const inicioDia = new Date();
	inicioDia.setHours(0, 0, 0, 0);
	const yaEnvio = await prisma.notificacion.findFirst({
		where: {
			tipo: 'RECORDATORIO_PAGO',
			destinatario: cot.cliente.correo,
			creadoEn: { gte: inicioDia },
			estado: { in: ['ENVIANDO', 'ACEPTADA_POR_PROVEEDOR', 'ENTREGADA'] }
		}
	});
	if (yaEnvio) {
		return { ok: false, message: 'Ya se envió un recordatorio a este cliente hoy.' };
	}

	const pagado = cot.pagos.reduce((a, p) => a + Number(p.monto), 0);
	const pendiente = Number(cot.total) - pagado;
	if (pendiente <= 0) return { ok: false, message: 'Esta cotización no tiene saldo pendiente.' };

	const notif = await prisma.notificacion.create({
		data: {
			cotizacionId,
			tipo: 'RECORDATORIO_PAGO',
			estado: 'ENVIANDO',
			destinatario: cot.cliente.correo,
			asunto: `Recordatorio de pago ${cot.numero}`
		}
	});

	const mailer = getMailer();
	if (!mailer) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'FALLIDA', errorTecnico: 'RESEND_API_KEY no configurada' }
		});
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}

	try {
		const despacho = await getDespacho();
		const html = `
		<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto">
			<h1 style="color:#0f3d2e">${escapeHtml(despacho.nombre)}</h1>
			<p>Hola ${escapeHtml(cot.cliente.nombre)},</p>
			<p>Te recordamos que la cotización <strong>${escapeHtml(cot.numero)}</strong> del ${new Date(cot.fecha).toLocaleDateString('es-MX')} tiene un saldo pendiente de <strong>${formatMXN(pendiente)}</strong>.</p>
			${despacho.transferencia ? `<p><strong>Datos de transferencia:</strong><br>${escapeHtml(despacho.transferencia)}</p>` : ''}
			<p style="color:#6b7280;font-size:13px">${escapeHtml(despacho.correo)}</p>
		</div>`;

		const result = await mailer.send({
			from: env.FROM_EMAIL || 'onboarding@resend.dev',
			to: cot.cliente.correo,
			subject: `Recordatorio de pago — ${cot.numero}`,
			html
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			logError('enviarRecordatorioPago', result.error, { cotizacionId });
			return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'ACEPTADA_POR_PROVEEDOR', proveedorId: result.id || null }
		});
		await prisma.historialCot.create({
			data: {
				cotizacionId,
				estadoAnterior: cot.estado,
				estadoNuevo: cot.estado,
				nota: `Recordatorio de pago aceptado por el proveedor${meta.userName ? ` (${meta.userName})` : ''} — entrega no confirmada`,
				usuarioId: meta.userId,
				usuarioNombre: meta.userName
			}
		});
		return { ok: true };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: { estado: 'FALLIDA', errorTecnico: e instanceof Error ? e.message : String(e) }
		});
		logError('enviarRecordatorioPago', e, { cotizacionId });
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
