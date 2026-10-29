import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import { prisma } from './prisma.js';
import { formatMXN } from './money.js';
import { crearTokenPublico } from './tokens.js';
import { logError, logInfo } from './logger.js';
import { getMailerOverride } from './mailer.js';
import {
	templateCotizacionEnviada,
	templateRecordatorioPago,
	templateCotizacionAprobada
} from './emailTemplates.js';

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

/**
 * Cliente genérico Resend (Form Actions / jobs).
 * @param {{ to: string, subject: string, html: string, from?: string }} opts
 */
export async function sendEmail({ to, subject, html, from }) {
	const mailer = getMailer();
	if (!mailer) {
		console.error('[Resend] RESEND_API_KEY no configurada');
		return { ok: false, error: 'RESEND_API_KEY no configurada' };
	}
	try {
		const sendPromise = mailer.send({
			from: from || env.FROM_EMAIL || 'onboarding@resend.dev',
			to,
			subject,
			html
		});
		const result = await Promise.race([
			sendPromise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Tiempo de espera agotado al enviar el correo')), 20000)
			)
		]);
		if (!result.ok) {
			console.error('[Resend] Error al enviar:', result.error);
			return { ok: false, error: result.error };
		}
		console.log('[Resend] Correo enviado. ID:', result.id);
		return { ok: true, id: result.id };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[Resend] Excepción:', err);
		return { ok: false, error: message };
	}
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

	try {
		const token = await crearTokenPublico(cotizacionId);
		const origin = pub.PUBLIC_ORIGIN || env.ORIGIN || 'http://localhost:5173';
		const link = `${origin}/publico/cotizacion/${token}`;
		const despacho = await getDespacho();

		const html = templateCotizacionEnviada({
			cliente: cot.cliente,
			cotizacion: cot,
			conceptos: cot.conceptos,
			linkPublico: link,
			despachoNombre: despacho.nombre
		});

		const result = await sendEmail({
			to: cot.cliente.correo,
			subject: `Cotización ${cot.numero} — ${formatMXN(cot.total)} MXN`,
			html
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			await prisma.historialCot.create({
				data: {
					cotizacionId,
					estadoAnterior: cot.estado,
					estadoNuevo: cot.estado,
					nota: `Error al enviar correo a ${cot.cliente.correo}: ${stringifyError(result.error)}`
				}
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
				nota: `Correo enviado a ${cot.cliente.correo}`
			}
		});
		logInfo('correo_enviada_ok', { cotizacionId, notifId: notif.id });
		return { ok: true, id: result.id };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'FALLIDA',
				errorTecnico: e instanceof Error ? e.message : String(e)
			}
		});
		await prisma.historialCot.create({
			data: {
				cotizacionId,
				estadoAnterior: cot.estado,
				estadoNuevo: cot.estado,
				nota: `Error al enviar correo: ${e instanceof Error ? e.message : String(e)}`
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

	try {
		const despacho = await getDespacho();
		const html = templateCotizacionAprobada({
			cliente: cot.cliente,
			cotizacion: cot,
			despachoNombre: despacho.nombre
		});

		const result = await sendEmail({
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
		return { ok: true, id: result.id };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'FALLIDA',
				errorTecnico: e instanceof Error ? e.message : String(e)
			}
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

	try {
		const despacho = await getDespacho();
		const html = templateRecordatorioPago({
			cliente: cot.cliente,
			cotizacion: cot,
			saldoPendiente: pendiente,
			datosTransferencia: despacho.transferencia || null,
			despachoNombre: despacho.nombre
		});

		const result = await sendEmail({
			to: cot.cliente.correo,
			subject: `Recordatorio de pago — ${cot.numero}`,
			html
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			await prisma.historialCot.create({
				data: {
					cotizacionId,
					estadoAnterior: cot.estado,
					estadoNuevo: cot.estado,
					nota: `Error al enviar recordatorio a ${cot.cliente.correo}: ${stringifyError(result.error)}`,
					usuarioId: meta.userId,
					usuarioNombre: meta.userName
				}
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
				nota: `Recordatorio de pago enviado a ${cot.cliente.correo}${
					meta.userName ? ` (${meta.userName})` : ''
				}`,
				usuarioId: meta.userId,
				usuarioNombre: meta.userName
			}
		});
		return { ok: true, id: result.id };
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'FALLIDA',
				errorTecnico: e instanceof Error ? e.message : String(e)
			}
		});
		logError('enviarRecordatorioPago', e, { cotizacionId });
		return { ok: false, message: 'No se pudo enviar el correo. Intenta nuevamente.' };
	}
}

/**
 * @param {unknown} error
 */
function stringifyError(error) {
	if (!error) return 'error desconocido';
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}
