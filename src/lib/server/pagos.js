import { prisma } from './prisma.js';
import { parsePagoInput } from './validators.js';
import { money, toMoneyString } from './money.js';
import { saldoDeCotizacion } from './finance.js';
import { logError } from './logger.js';

/**
 * @param {string} cotizacionId
 * @param {unknown} input
 * @param {{ userId?: string, userName?: string }} meta
 */
export async function registrarPago(cotizacionId, input, meta = {}) {
	const parsed = parsePagoInput(input);
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

	if (parsed.data.idempotencyKey) {
		const existing = await prisma.pago.findUnique({
			where: { idempotencyKey: parsed.data.idempotencyKey }
		});
		if (existing) {
			const cot = await prisma.cotizacion.findUnique({
				where: { id: cotizacionId },
				include: { pagos: true, cliente: true }
			});
			return { ok: true, pago: existing, cotizacion: cot, idempotent: true };
		}
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			const cot = await tx.cotizacion.findUnique({
				where: { id: cotizacionId },
				include: { pagos: true }
			});
			if (!cot) {
				const err = new Error('NOT_FOUND');
				/** @type {any} */ (err).code = 'NOT_FOUND';
				throw err;
			}
			if (!['APROBADA', 'FACTURADA'].includes(cot.estado)) {
				const err = new Error('ESTADO_INVALIDO');
				/** @type {any} */ (err).code = 'ESTADO_INVALIDO';
				throw err;
			}

			const saldo = saldoDeCotizacion(cot, { raw: true });
			const monto = money(parsed.data.monto);
			if (monto.gt(saldo.pendienteDecimal)) {
				const err = new Error('MONTO_EXCEDE');
				/** @type {any} */ (err).code = 'MONTO_EXCEDE';
				/** @type {any} */ (err).pendiente = saldo.pendiente;
				throw err;
			}

			const fechaEmision = new Date(cot.fecha);
			fechaEmision.setUTCHours(0, 0, 0, 0);
			const fechaPago = new Date(parsed.data.fecha);
			fechaPago.setUTCHours(12, 0, 0, 0);
			if (fechaPago < fechaEmision) {
				const err = new Error('FECHA_ANTERIOR');
				/** @type {any} */ (err).code = 'FECHA_ANTERIOR';
				throw err;
			}

			const pago = await tx.pago.create({
				data: {
					cotizacionId,
					monto: toMoneyString(monto),
					fecha: parsed.data.fecha,
					metodo: parsed.data.metodo,
					referencia: parsed.data.referencia,
					creadoPorId: meta.userId,
					creadoPorNombre: meta.userName,
					idempotencyKey: parsed.data.idempotencyKey || null
				}
			});

			const pagosActualizados = [...cot.pagos, pago];
			const nuevoSaldo = saldoDeCotizacion({ total: cot.total, pagos: pagosActualizados }, { raw: true });

			let estado = cot.estado;
			if (nuevoSaldo.estaPagada) {
				estado = 'PAGADA';
				await tx.cotizacion.update({
					where: { id: cotizacionId },
					data: { estado: 'PAGADA' }
				});
				await tx.historialCot.create({
					data: {
						cotizacionId,
						estadoAnterior: cot.estado,
						estadoNuevo: 'PAGADA',
						nota: 'Pago completo registrado — estado automático PAGADA',
						usuarioId: meta.userId,
						usuarioNombre: meta.userName
					}
				});
			} else {
				await tx.historialCot.create({
					data: {
						cotizacionId,
						estadoAnterior: cot.estado,
						estadoNuevo: cot.estado,
						nota: `Pago registrado: ${toMoneyString(monto)} (${parsed.data.metodo})`,
						usuarioId: meta.userId,
						usuarioNombre: meta.userName
					}
				});
			}

			const cotizacion = await tx.cotizacion.findUnique({
				where: { id: cotizacionId },
				include: { pagos: true, cliente: true, conceptos: true }
			});
			return { pago, cotizacion, estado };
		});

		return { ok: true, ...result };
	} catch (e) {
		const code = /** @type {any} */ (e)?.code;
		if (code === 'NOT_FOUND') return { ok: false, fieldErrors: { _form: 'Cotización no encontrada' } };
		if (code === 'ESTADO_INVALIDO') {
			return {
				ok: false,
				fieldErrors: { _form: 'Solo se pueden registrar pagos en cotizaciones APROBADAS o FACTURADAS.' }
			};
		}
		if (code === 'MONTO_EXCEDE') {
			return {
				ok: false,
				fieldErrors: {
					monto: `El monto no puede exceder el saldo pendiente (${/** @type {any} */ (e).pendiente}).`
				}
			};
		}
		if (code === 'FECHA_ANTERIOR') {
			return {
				ok: false,
				fieldErrors: { fecha: 'La fecha de pago no puede ser anterior a la emisión de la cotización.' }
			};
		}
		if (code === 'P2002') {
			const existing = parsed.data.idempotencyKey
				? await prisma.pago.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
				: null;
			if (existing) return { ok: true, pago: existing, idempotent: true };
		}
		logError('registrarPago', e, { cotizacionId });
		return { ok: false, fieldErrors: { _form: 'No se pudo registrar el pago. Intenta nuevamente.' } };
	}
}

/**
 * @param {string} pagoId
 * @param {{ userId?: string, userName?: string }} meta
 */
export async function eliminarPago(pagoId, meta = {}) {
	try {
		return await prisma.$transaction(async (tx) => {
			const pago = await tx.pago.findUnique({
				where: { id: pagoId },
				include: { cotizacion: { include: { pagos: true } } }
			});
			if (!pago) return { ok: false, message: 'Pago no encontrado' };
			if (pago.cotizacion.estado === 'PAGADA') {
				return { ok: false, message: 'No se pueden eliminar pagos de una cotización marcada como PAGADA.' };
			}

			await tx.pago.delete({ where: { id: pagoId } });
			await tx.historialCot.create({
				data: {
					cotizacionId: pago.cotizacionId,
					estadoAnterior: pago.cotizacion.estado,
					estadoNuevo: pago.cotizacion.estado,
					nota: `Pago eliminado: ${toMoneyString(pago.monto)}`,
					usuarioId: meta.userId,
					usuarioNombre: meta.userName
				}
			});

			return { ok: true };
		});
	} catch (e) {
		logError('eliminarPago', e, { pagoId });
		return { ok: false, message: 'No se pudo eliminar el pago.' };
	}
}
