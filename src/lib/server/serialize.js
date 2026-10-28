import { toMoneyString } from './money.js';

/**
 * @param {any} value
 */
export function dec(value) {
	if (value == null) return value;
	return toMoneyString(value);
}

/**
 * @param {any} cot
 */
export function serializeCotizacion(cot) {
	if (!cot) return cot;
	return {
		...cot,
		subtotal: dec(cot.subtotal),
		iva: dec(cot.iva),
		total: dec(cot.total),
		conceptos: cot.conceptos
			? cot.conceptos.map((/** @type {any} */ c) => ({
					...c,
					precioUnitario: dec(c.precioUnitario),
					subtotal: dec(c.subtotal)
				}))
			: cot.conceptos,
		pagos: cot.pagos
			? cot.pagos.map((/** @type {any} */ p) => ({
					...p,
					monto: dec(p.monto)
				}))
			: cot.pagos
	};
}
