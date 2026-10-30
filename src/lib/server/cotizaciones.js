import { prisma } from './prisma.js';
import { parseCotizacionInput } from './validators.js';
import { calcularTotales, toMoneyString, money } from './money.js';
import { saldoDeCotizacion } from './finance.js';
import { logError } from './logger.js';
import { enviarCorreoCotizacion, enviarCorreoAprobacion } from './email.js';
import { serializeCotizacion, dec } from './serialize.js';

/** @type {Record<string, string[]>} */
export const TRANSICIONES = {
	BORRADOR: ['ENVIADA'],
	ENVIADA: ['APROBADA', 'RECHAZADA'],
	APROBADA: [], // pagos → PAGADA automática; no se factura con saldo pendiente
	RECHAZADA: [], // reabrir es acción especial
	PAGADA: ['FACTURADA'], // solo se factura cuando ya está cobrada al 100%
	FACTURADA: []
};

/**
 * Preview del próximo número sin consumir el contador.
 * @param {number} [anio]
 */
export async function previsualizarNumeroCotizacion(anio = new Date().getUTCFullYear()) {
	const contador = await prisma.contadorCotizacion.findUnique({ where: { anio } });
	const n = contador?.siguiente ?? 1;
	return `COT-${anio}-${String(n).padStart(3, '0')}`;
}

/**
 * @param {number} [anio]
 */
export async function generarNumeroCotizacion(anio = new Date().getUTCFullYear()) {
	return prisma.$transaction(async (tx) => {
		const contador = await tx.contadorCotizacion.upsert({
			where: { anio },
			create: { anio, siguiente: 2 },
			update: { siguiente: { increment: 1 } }
		});
		// upsert create starts at 2 after assigning 1; upsert update returns post-increment value
		const n = contador.siguiente - 1;
		const numero = `COT-${anio}-${String(n).padStart(3, '0')}`;
		return numero;
	});
}

/**
 * @param {unknown} input
 * @param {{ userId?: string, userName?: string, userEmail?: string | null, idempotencyKey?: string | null, enviar?: boolean }} meta
 */
export async function crearCotizacion(input, meta = {}) {
	const parsed = parseCotizacionInput(input);
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

	if (meta.idempotencyKey) {
		const existing = await prisma.idempotencyKey.findUnique({ where: { clave: meta.idempotencyKey } });
		if (existing?.recursoId) {
			let cot = await prisma.cotizacion.findUnique({
				where: { id: existing.recursoId },
				include: { conceptos: true, cliente: true }
			});
			if (cot) {
				/** @type {string | null | undefined} */
				let avisoCorreo;
				// Reintento con "enviar": si quedó en borrador, completar el envío
				if (meta.enviar && cot.estado === 'BORRADOR') {
					const enviado = await cambiarEstado(cot.id, 'ENVIADA', {
						userId: meta.userId,
						userName: meta.userName,
						userEmail: meta.userEmail
					});
					if (enviado.ok) {
						cot = enviado.cotizacion ?? cot;
						avisoCorreo = enviado.avisoCorreo;
					} else {
						avisoCorreo =
							enviado.message || 'Cotización creada, pero no se pudo marcar como ENVIADA.';
					}
				}
				return { ok: true, cotizacion: cot, idempotent: true, avisoCorreo };
			}
		}
	}

	const cliente = await prisma.cliente.findUnique({ where: { id: parsed.data.clienteId } });
	if (!cliente || !cliente.activo) {
		return { ok: false, fieldErrors: { clienteId: 'Selecciona un cliente activo' } };
	}

	try {
		const totales = calcularTotales(parsed.data.conceptos);
		const cotizacion = await prisma.$transaction(async (tx) => {
			const anio = parsed.data.fecha.getUTCFullYear();
			const contador = await tx.contadorCotizacion.upsert({
				where: { anio },
				create: { anio, siguiente: 2 },
				update: { siguiente: { increment: 1 } }
			});
			const numero = `COT-${anio}-${String(contador.siguiente - 1).padStart(3, '0')}`;

			const created = await tx.cotizacion.create({
				data: {
					numero,
					clienteId: parsed.data.clienteId,
					fecha: parsed.data.fecha,
					vencimiento: parsed.data.vencimiento,
					notas: parsed.data.notas,
					subtotal: totales.subtotal,
					iva: totales.iva,
					total: totales.total,
					estado: 'BORRADOR',
					creadoPorId: meta.userId,
					creadoPorNombre: meta.userName,
					conceptos: {
						create: parsed.data.conceptos.map((c, i) => ({
							descripcion: c.descripcion,
							cantidad: c.cantidad,
							precioUnitario: totales.lineas[i].precioUnitario,
							subtotal: totales.lineas[i].subtotal,
							orden: i
						}))
					},
					historial: {
						create: {
							estadoAnterior: null,
							estadoNuevo: 'BORRADOR',
							nota: 'Cotización creada',
							usuarioId: meta.userId,
							usuarioNombre: meta.userName
						}
					}
				},
				include: { conceptos: true, cliente: true }
			});

			if (meta.idempotencyKey) {
				await tx.idempotencyKey.create({
					data: {
						clave: meta.idempotencyKey,
						recurso: 'cotizacion',
						recursoId: created.id,
						cotizacionId: created.id,
						respuesta: { id: created.id, numero: created.numero }
					}
				});
			}
			return created;
		});

		if (meta.enviar) {
			const enviado = await cambiarEstado(cotizacion.id, 'ENVIADA', {
				userId: meta.userId,
				userName: meta.userName,
				userEmail: meta.userEmail
			});
			if (!enviado.ok) {
				return {
					ok: true,
					cotizacion,
					avisoCorreo: enviado.message || 'Cotización creada, pero no se pudo marcar como ENVIADA.'
				};
			}
			return {
				ok: true,
				cotizacion: enviado.cotizacion ?? cotizacion,
				avisoCorreo: enviado.avisoCorreo
			};
		}

		return { ok: true, cotizacion };
	} catch (e) {
		logError('crearCotizacion', e);
		return { ok: false, fieldErrors: { _form: 'No se pudo crear la cotización. Intenta nuevamente.' } };
	}
}

/**
 * @param {string} id
 * @param {unknown} input
 */
export async function actualizarBorrador(id, input) {
	const actual = await prisma.cotizacion.findUnique({ where: { id }, include: { conceptos: true } });
	if (!actual) return { ok: false, fieldErrors: { _form: 'Cotización no encontrada' } };
	if (actual.estado !== 'BORRADOR') {
		return { ok: false, fieldErrors: { _form: 'Solo se pueden editar cotizaciones en borrador' } };
	}

	const parsed = parseCotizacionInput(input);
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

	const cliente = await prisma.cliente.findUnique({ where: { id: parsed.data.clienteId } });
	if (!cliente || !cliente.activo) {
		return { ok: false, fieldErrors: { clienteId: 'Selecciona un cliente activo' } };
	}

	try {
		const totales = calcularTotales(parsed.data.conceptos);
		const cotizacion = await prisma.$transaction(async (tx) => {
			await tx.concepto.deleteMany({ where: { cotizacionId: id } });
			return tx.cotizacion.update({
				where: { id },
				data: {
					clienteId: parsed.data.clienteId,
					fecha: parsed.data.fecha,
					vencimiento: parsed.data.vencimiento,
					notas: parsed.data.notas,
					subtotal: totales.subtotal,
					iva: totales.iva,
					total: totales.total,
					conceptos: {
						create: parsed.data.conceptos.map((c, i) => ({
							descripcion: c.descripcion,
							cantidad: c.cantidad,
							precioUnitario: totales.lineas[i].precioUnitario,
							subtotal: totales.lineas[i].subtotal,
							orden: i
						}))
					}
				},
				include: { conceptos: true, cliente: true }
			});
		});
		return { ok: true, cotizacion };
	} catch (e) {
		logError('actualizarBorrador', e);
		return { ok: false, fieldErrors: { _form: 'No se pudo actualizar la cotización.' } };
	}
}

/**
 * @param {string} id
 * @param {string} nuevoEstado
 * @param {{ userId?: string, userName?: string, userEmail?: string | null, motivo?: string }} meta
 */
export async function cambiarEstado(id, nuevoEstado, meta = {}) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id },
		include: { cliente: true, conceptos: true, pagos: true }
	});
	if (!cot) return { ok: false, message: 'Cotización no encontrada' };

	if (nuevoEstado === 'PAGADA') {
		return {
			ok: false,
			message:
				'No puedes marcar PAGADA manualmente. Registra pagos hasta cubrir el total; el estado cambia solo.'
		};
	}
	if (cot.estado === 'RECHAZADA' && nuevoEstado !== 'BORRADOR') {
		return {
			ok: false,
			message: 'Una cotización rechazada solo puede reabrirse como borrador (con motivo).'
		};
	}

	const permitidos = TRANSICIONES[cot.estado] ?? [];
	if (!permitidos.includes(nuevoEstado)) {
		return { ok: false, message: `No se puede pasar de ${cot.estado} a ${nuevoEstado}.` };
	}

	if (nuevoEstado === 'FACTURADA') {
		const saldo = saldoDeCotizacion(cot, { raw: true });
		if (!saldo.estaPagada && saldo.pendienteDecimal.gt(0)) {
			return {
				ok: false,
				message:
					'No puedes facturar con saldo pendiente. Registra pagos hasta cubrir el total (estado PAGADA) y luego marca FACTURADA.'
			};
		}
	}

	/** @type {Record<string, any>} */
	const extra = {};
	if (nuevoEstado === 'FACTURADA') {
		extra.facturadaEn = new Date();
	}

	try {
		const updated = await prisma.$transaction(async (tx) => {
			const u = await tx.cotizacion.update({
				where: { id },
				data: { estado: /** @type {any} */ (nuevoEstado), ...extra },
				include: { cliente: true, conceptos: true, pagos: true, historial: true }
			});
			await tx.historialCot.create({
				data: {
					cotizacionId: id,
					estadoAnterior: cot.estado,
					estadoNuevo: /** @type {any} */ (nuevoEstado),
					nota: meta.motivo || null,
					usuarioId: meta.userId,
					usuarioNombre: meta.userName
				}
			});
			return u;
		});

		/** @type {string | null} */
		let avisoCorreo = null;
		if (nuevoEstado === 'ENVIADA') {
			const mail = await enviarCorreoCotizacion(updated.id, { userEmail: meta.userEmail });
			if (!mail.ok) {
				avisoCorreo = mail.message
					? `Cotización actualizada. ${mail.message}`
					: 'Cotización actualizada. El correo no pudo enviarse.';
			} else if (mail.message) {
				avisoCorreo = mail.message;
			}
		}
		if (nuevoEstado === 'APROBADA') {
			const mail = await enviarCorreoAprobacion(updated.id, { userEmail: meta.userEmail });
			if (!mail.ok) {
				avisoCorreo = mail.message
					? `Cotización actualizada. ${mail.message}`
					: 'Cotización actualizada. El correo no pudo enviarse.';
			}
		}

		return { ok: true, cotizacion: updated, avisoCorreo };
	} catch (e) {
		logError('cambiarEstado', e);
		return { ok: false, message: 'No se pudo cambiar el estado.' };
	}
}

/**
 * Reabrir rechazada como borrador
 * @param {string} id
 * @param {{ userId?: string, userName?: string, motivo: string }} meta
 */
export async function reabrirComoBorrador(id, meta) {
	if (!meta.motivo?.trim()) {
		return { ok: false, message: 'El motivo es obligatorio para reabrir la cotización.' };
	}
	const cot = await prisma.cotizacion.findUnique({ where: { id } });
	if (!cot) return { ok: false, message: 'Cotización no encontrada' };
	if (cot.estado !== 'RECHAZADA') {
		return { ok: false, message: 'Solo se pueden reabrir cotizaciones rechazadas.' };
	}

	try {
		const updated = await prisma.$transaction(async (tx) => {
			const u = await tx.cotizacion.update({
				where: { id },
				data: { estado: 'BORRADOR' },
				include: { cliente: true, conceptos: true, pagos: true }
			});
			await tx.historialCot.create({
				data: {
					cotizacionId: id,
					estadoAnterior: 'RECHAZADA',
					estadoNuevo: 'BORRADOR',
					nota: meta.motivo.trim(),
					usuarioId: meta.userId,
					usuarioNombre: meta.userName
				}
			});
			return u;
		});
		return { ok: true, cotizacion: updated };
	} catch (e) {
		logError('reabrirComoBorrador', e);
		return { ok: false, message: 'No se pudo reabrir la cotización.' };
	}
}

/**
 * @param {URLSearchParams} params
 */
export async function listarCotizaciones(params) {
	const page = Math.max(1, Number(params.get('page')) || 1);
	const take = 20;
	const skip = (page - 1) * take;
	const q = params.get('q') || '';
	const estado = params.get('estado') || '';
	const clienteId = params.get('clienteId') || '';
	const desde = params.get('desde') || '';
	const hasta = params.get('hasta') || '';

	/** @type {import('@prisma/client').Prisma.CotizacionWhereInput} */
	const where = {};
	if (estado) where.estado = /** @type {any} */ (estado);
	if (clienteId) where.clienteId = clienteId;
	if (desde || hasta) {
		where.fecha = {};
		if (desde) /** @type {any} */ (where.fecha).gte = new Date(`${desde}T00:00:00.000Z`);
		if (hasta) /** @type {any} */ (where.fecha).lte = new Date(`${hasta}T23:59:59.999Z`);
	}
	if (q.trim()) {
		where.OR = [
			{ numero: { contains: q.trim(), mode: 'insensitive' } },
			{ cliente: { nombre: { contains: q.trim(), mode: 'insensitive' } } }
		];
	}

	const [total, items] = await Promise.all([
		prisma.cotizacion.count({ where }),
		prisma.cotizacion.findMany({
			where,
			include: {
				cliente: { select: { id: true, nombre: true, empresa: true } },
				pagos: { select: { monto: true } }
			},
			orderBy: { creadoEn: 'desc' },
			skip,
			take
		})
	]);

	return {
		items: items.map((c) => {
			const saldo = saldoDeCotizacion(c);
			return {
				...serializeCotizacion(c),
				totalFmt: saldo.total,
				saldo
			};
		}),
		page,
		total,
		totalPages: Math.max(1, Math.ceil(total / take)),
		filters: { q, estado, clienteId, desde, hasta }
	};
}

/**
 * @param {string} id
 */
export async function obtenerCotizacion(id) {
	const cot = await prisma.cotizacion.findUnique({
		where: { id },
		include: {
			cliente: true,
			conceptos: { orderBy: { orden: 'asc' } },
			pagos: { orderBy: { fecha: 'desc' } },
			historial: { orderBy: { creadoEn: 'desc' } },
			notificaciones: { orderBy: { creadoEn: 'desc' }, take: 20 }
		}
	});
	if (!cot) return null;
	const saldo = saldoDeCotizacion(cot);
	return { ...serializeCotizacion(cot), saldo };
}

export { money, toMoneyString, dec, serializeCotizacion };
