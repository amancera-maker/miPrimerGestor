import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const IVA_TASA = new Decimal('0.16');

/**
 * @param {string | number | Decimal} value
 * @returns {Decimal}
 */
export function money(value) {
	if (value instanceof Decimal) return value;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new Error('Importe inválido');
		}
		return new Decimal(value);
	}
	const cleaned = String(value).trim().replace(/,/g, '');
	if (!cleaned || cleaned === 'NaN' || cleaned === 'Infinity' || cleaned === '-Infinity') {
		throw new Error('Importe inválido');
	}
	return new Decimal(cleaned);
}

/**
 * @param {Decimal} value
 * @returns {string}
 */
export function toMoneyString(value) {
	return money(value).toFixed(2);
}

/**
 * @param {string | number | Decimal} precioUnitario
 * @param {number} cantidad
 */
export function calcularLinea(precioUnitario, cantidad) {
	const qty = Number(cantidad);
	if (!Number.isInteger(qty) || qty < 1) {
		throw new Error('La cantidad debe ser un entero positivo');
	}
	const precio = money(precioUnitario);
	if (precio.lte(0)) {
		throw new Error('El precio unitario debe ser mayor que cero');
	}
	if (precio.decimalPlaces() > 2) {
		throw new Error('El precio unitario admite máximo dos decimales');
	}
	const subtotal = precio.mul(qty).toDecimalPlaces(2);
	return { cantidad: qty, precioUnitario: toMoneyString(precio), subtotal: toMoneyString(subtotal) };
}

/**
 * @param {{ precioUnitario: string | number; cantidad: number }[]} conceptos
 */
export function calcularTotales(conceptos) {
	if (!conceptos?.length) {
		throw new Error('Se requiere al menos un concepto');
	}
	let subtotal = new Decimal(0);
	const lineas = conceptos.map((c) => {
		const linea = calcularLinea(c.precioUnitario, c.cantidad);
		subtotal = subtotal.plus(linea.subtotal);
		return linea;
	});
	subtotal = subtotal.toDecimalPlaces(2);
	const iva = subtotal.mul(IVA_TASA).toDecimalPlaces(2);
	const total = subtotal.plus(iva).toDecimalPlaces(2);
	return {
		lineas,
		subtotal: toMoneyString(subtotal),
		iva: toMoneyString(iva),
		total: toMoneyString(total)
	};
}

/**
 * @param {string | number | Decimal} total
 * @param {Array<string | number | Decimal>} montosPagos
 */
export function calcularSaldo(total, montosPagos = []) {
	const t = money(total);
	const pagado = montosPagos.reduce((acc, m) => acc.plus(money(m)), new Decimal(0)).toDecimalPlaces(2);
	const pendiente = t.minus(pagado).toDecimalPlaces(2);
	return {
		total: toMoneyString(t),
		pagado: toMoneyString(pagado),
		// lte(0): cubre total exacto o redondeos; PAGADA automática no exige eq estricto
		pendiente: toMoneyString(pendiente.lt(0) ? new Decimal(0) : pendiente),
		estaPagada: pendiente.lte(0),
		pendienteDecimal: pendiente.lt(0) ? new Decimal(0) : pendiente,
		pagadoDecimal: pagado
	};
}

/**
 * @param {string | number | Decimal} value
 */
export function formatMXN(value) {
	const n = Number(toMoneyString(value));
	return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}
