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

function getFromAddress() {
	return env.FROM_EMAIL || 'onboarding@resend.dev';
}

/** Remitente de prueba de Resend: solo permite enviar a la cuenta dueña de la API key. */
function isSandboxFrom(from = getFromAddress()) {
	return /resend\.dev/i.test(from);
}

/**
 * @param {string} to
 * @param {string | null | undefined} fallbackTo
 */
function resolveDelivery(to, fallbackTo) {
	const from = getFromAddress();
	const configured = (env.EMAIL_TEST_TO || env.RESEND_TEST_TO || '').trim();
	const fallback = (fallbackTo || '').trim();
	const redirectTo = configured || fallback;

	if (isSandboxFrom(from) && redirectTo && redirectTo.toLowerCase() !== String(to).toLowerCase()) {
		return {
			from,
			to: redirectTo,
			originalTo: to,
			redirected: true
		};
	}
	return { from, to, originalTo: to, redirected: false };
}

/**
 * @param {string} html
 * @param {string} originalTo
 * @param {string} actualTo
 */
function wrapDemoBanner(html, originalTo, actualTo) {
	const banner = `<div style="background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:12px 16px;margin:0 0 16px;border-radius:8px;font-size:13px;">
		<strong>Modo demo Resend:</strong> el destinatario original era
		<code>${escapeText(originalTo)}</code>; se entregó a
		<code>${escapeText(actualTo)}</code> porque el remitente de prueba
		(<code>onboarding@resend.dev</code>) solo puede enviar a tu correo verificado.
	</div>`;
	return html.includes('<body')
		? html.replace(/<body([^>]*)>/i, `<body$1>${banner}`)
		: banner + html;
}

/**
 * @param {unknown} s
 */
function escapeText(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * @param {unknown} error
 */
export function humanizeMailError(error) {
	const raw = stringifyError(error).toLowerCase();
	if (!error) return 'No se pudo enviar el correo.';
	if (raw.includes('resend_api_key') || raw.includes('no configurada')) {
		return 'Falta configurar RESEND_API_KEY en el servidor.';
	}
	if (
		raw.includes('only send testing emails') ||
		raw.includes('you can only send') ||
		(raw.includes('validation_error') && raw.includes('to'))
	) {
		return 'Resend en modo prueba solo entrega a tu correo de la cuenta. Define EMAIL_TEST_TO con ese correo o verifica un dominio en Resend.';
	}
	if (raw.includes('invalid') && raw.includes('from')) {
		return 'El remitente FROM_EMAIL no está verificado en Resend.';
	}
	if (raw.includes('tiempo de espera') || raw.includes('timeout') || raw.includes('aborted')) {
		return 'El envío tardó demasiado. Intenta de nuevo en unos segundos.';
	}
	const short = stringifyError(error);
	if (short.length <= 180) return `No se pudo enviar el correo: ${short}`;
	return 'No se pudo enviar el correo. Revisa la configuración de Resend.';
}

/**
 * Cliente genérico Resend (Form Actions / jobs).
 * @param {{ to: string, subject: string, html: string, from?: string, fallbackTo?: string | null }} opts
 */
export async function sendEmail({ to, subject, html, from, fallbackTo = null }) {
	const mailer = getMailer();
	if (!mailer) {
		console.error('[Resend] RESEND_API_KEY no configurada');
		return { ok: false, error: 'RESEND_API_KEY no configurada', message: humanizeMailError('RESEND_API_KEY no configurada') };
	}

	const delivery = resolveDelivery(to, fallbackTo);
	let finalHtml = html;
	let finalSubject = subject;
	if (delivery.redirected) {
		finalHtml = wrapDemoBanner(html, delivery.originalTo, delivery.to);
		finalSubject = `[Demo → ${delivery.originalTo}] ${subject}`;
		logInfo('email_sandbox_redirect', { originalTo: delivery.originalTo, to: delivery.to });
	}

	try {
		const sendPromise = mailer.send({
			from: from || delivery.from,
			to: delivery.to,
			subject: finalSubject,
			html: finalHtml
		});
		const result = await Promise.race([
			sendPromise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Tiempo de espera agotado al enviar el correo')), 20000)
			)
		]);
		if (!result.ok) {
			console.error('[Resend] Error al enviar:', result.error);
			return {
				ok: false,
				error: result.error,
				message: humanizeMailError(result.error),
				deliveredTo: delivery.to,
				redirected: delivery.redirected
			};
		}
		console.log('[Resend] Correo enviado. ID:', result.id, '→', delivery.to);
		return {
			ok: true,
			id: result.id,
			deliveredTo: delivery.to,
			redirected: delivery.redirected,
			originalTo: delivery.originalTo
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[Resend] Excepción:', err);
		return { ok: false, error: message, message: humanizeMailError(message) };
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
 * @param {{ userEmail?: string | null }} [meta]
 */
export async function enviarCorreoCotizacion(cotizacionId, meta = {}) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: { cliente: true, conceptos: { orderBy: { orden: 'asc' } } }
	});
	if (!cot) return { ok: false, message: 'Cotización no encontrada' };

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
			html,
			fallbackTo: meta.userEmail
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
			return { ok: false, message: result.message || humanizeMailError(result.error) };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'ACEPTADA_POR_PROVEEDOR',
				proveedorId: result.id || null,
				destinatario: result.deliveredTo || cot.cliente.correo
			}
		});
		const destinoNota = result.redirected
			? `${cot.cliente.correo} (demo → ${result.deliveredTo})`
			: cot.cliente.correo;
		await prisma.historialCot.create({
			data: {
				cotizacionId,
				estadoAnterior: cot.estado,
				estadoNuevo: cot.estado,
				nota: `Correo enviado a ${destinoNota}`
			}
		});
		logInfo('correo_enviada_ok', { cotizacionId, notifId: notif.id });
		return {
			ok: true,
			id: result.id,
			message: result.redirected
				? `Correo de demo enviado a ${result.deliveredTo} (cliente: ${cot.cliente.correo}).`
				: undefined
		};
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
		return { ok: false, message: humanizeMailError(e) };
	}
}

/**
 * @param {string} cotizacionId
 * @param {{ userEmail?: string | null }} [meta]
 */
export async function enviarCorreoAprobacion(cotizacionId, meta = {}) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id: cotizacionId },
		include: { cliente: true }
	});
	if (!cot) return { ok: false, message: 'Cotización no encontrada' };

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
			html,
			fallbackTo: meta.userEmail
		});

		if (!result.ok) {
			await prisma.notificacion.update({
				where: { id: notif.id },
				data: { estado: 'FALLIDA', errorTecnico: JSON.stringify(result.error) }
			});
			logError('enviarCorreoAprobacion', result.error, { cotizacionId });
			return { ok: false, message: result.message || humanizeMailError(result.error) };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'ACEPTADA_POR_PROVEEDOR',
				proveedorId: result.id || null,
				destinatario: result.deliveredTo || cot.cliente.correo
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
		logError('enviarCorreoAprobacion', e, { cotizacionId });
		return { ok: false, message: humanizeMailError(e) };
	}
}

/**
 * @param {string} cotizacionId
 * @param {{ userId?: string, userName?: string, userEmail?: string | null }} meta
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
	// Solo cuentan envíos exitosos (no bloquea reintentos tras FALLIDA / ENVIANDO colgado)
	const yaEnvio = await prisma.notificacion.findFirst({
		where: {
			tipo: 'RECORDATORIO_PAGO',
			destinatario: cot.cliente.correo,
			creadoEn: { gte: inicioDia },
			estado: { in: ['ACEPTADA_POR_PROVEEDOR', 'ENTREGADA'] }
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
			html,
			fallbackTo: meta.userEmail
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
			return { ok: false, message: result.message || humanizeMailError(result.error) };
		}

		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'ACEPTADA_POR_PROVEEDOR',
				proveedorId: result.id || null,
				destinatario: result.deliveredTo || cot.cliente.correo
			}
		});
		const destinoNota = result.redirected
			? `${cot.cliente.correo} (demo → ${result.deliveredTo})`
			: cot.cliente.correo;
		await prisma.historialCot.create({
			data: {
				cotizacionId,
				estadoAnterior: cot.estado,
				estadoNuevo: cot.estado,
				nota: `Recordatorio de pago enviado a ${destinoNota}${
					meta.userName ? ` (${meta.userName})` : ''
				}`,
				usuarioId: meta.userId,
				usuarioNombre: meta.userName
			}
		});
		return {
			ok: true,
			id: result.id,
			message: result.redirected
				? `Recordatorio de demo enviado a ${result.deliveredTo} (cliente: ${cot.cliente.correo}).`
				: 'Recordatorio enviado'
		};
	} catch (e) {
		await prisma.notificacion.update({
			where: { id: notif.id },
			data: {
				estado: 'FALLIDA',
				errorTecnico: e instanceof Error ? e.message : String(e)
			}
		});
		logError('enviarRecordatorioPago', e, { cotizacionId });
		return { ok: false, message: humanizeMailError(e) };
	}
}

/**
 * @param {unknown} error
 */
function stringifyError(error) {
	if (!error) return 'error desconocido';
	if (typeof error === 'string') return error;
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error && 'message' in error) {
		return String(/** @type {{ message: unknown }} */ (error).message);
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}
