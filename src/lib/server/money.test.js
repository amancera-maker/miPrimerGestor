import { describe, expect, it } from 'vitest';
import { calcularLinea, calcularSaldo, calcularTotales, money, toMoneyString } from './money.js';

describe('money', () => {
	it('rechaza Infinity y NaN', () => {
		expect(() => money(Infinity)).toThrow();
		expect(() => money(NaN)).toThrow();
	});

	it('calcula línea con enteros', () => {
		const linea = calcularLinea('100.50', 3);
		expect(linea.subtotal).toBe('301.50');
	});

	it('rechaza cantidad fraccionaria', () => {
		expect(() => calcularLinea('10', 1.37)).toThrow(/entero/);
	});

	it('calcula IVA 16% con precisión decimal', () => {
		const t = calcularTotales([
			{ precioUnitario: '100', cantidad: 1 },
			{ precioUnitario: '50.25', cantidad: 2 }
		]);
		expect(t.subtotal).toBe('200.50');
		expect(t.iva).toBe('32.08');
		expect(t.total).toBe('232.58');
	});

	it('calcula saldo y marca pagada en cero', () => {
		const s = calcularSaldo('100.00', ['40', '60']);
		expect(s.pendiente).toBe('0.00');
		expect(s.estaPagada).toBe(true);
	});

	it('toMoneyString fija 2 decimales', () => {
		expect(toMoneyString('10')).toBe('10.00');
	});
});
