import { describe, expect, it } from 'vitest';
import { parseCliente, parseCotizacionInput, parsePagoInput } from './validators.js';

describe('parseCliente', () => {
	it('valida cliente correcto', () => {
		const r = parseCliente({
			nombre: 'Ana López',
			correo: 'ana@ejemplo.mx',
			telefono: '6141234567',
			rfc: 'LOPA800101ABC'
		});
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.data.nombreNormalizado).toBe('ana lopez');
			expect(r.data.telefonoNormalizado).toBe('+526141234567');
		}
	});

	it('exige correo válido', () => {
		const r = parseCliente({ nombre: 'Ana', correo: 'no-es-correo' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.fieldErrors.correo).toBeTruthy();
	});
});

describe('parseCotizacionInput', () => {
	it('rechaza vencimiento anterior a emisión', () => {
		const r = parseCotizacionInput({
			clienteId: 'c1',
			fecha: '2026-05-10',
			vencimiento: '2026-05-01',
			conceptos: [{ descripcion: 'Servicio', cantidad: 1, precioUnitario: '100' }]
		});
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.fieldErrors.vencimiento).toBeTruthy();
	});

	it('exige descripción de concepto', () => {
		const r = parseCotizacionInput({
			clienteId: 'c1',
			fecha: '2026-05-01',
			vencimiento: '2026-05-10',
			conceptos: [{ descripcion: '   ', cantidad: 1, precioUnitario: '100' }]
		});
		expect(r.ok).toBe(false);
	});
});

describe('parsePagoInput', () => {
	it('rechaza monto cero', () => {
		const r = parsePagoInput({
			monto: '0',
			fecha: '2026-05-01',
			metodo: 'EFECTIVO'
		});
		expect(r.ok).toBe(false);
	});
});
