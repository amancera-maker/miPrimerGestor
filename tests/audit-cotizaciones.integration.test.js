import { describe, expect, it, beforeEach } from 'vitest';
import { useIsolatedDb, clienteInput } from './helpers/db.js';
import { crearCliente } from '../src/lib/server/clientes.js';
import {
	crearCotizacion,
	actualizarBorrador,
	cambiarEstado,
	reabrirComoBorrador,
	obtenerCotizacion
} from '../src/lib/server/cotizaciones.js';
import { parseCotizacionInput } from '../src/lib/server/validators.js';
import { calcularTotales } from '../src/lib/server/money.js';
import { setMailer, createAcceptingMailer, createFailingMailer } from '../src/lib/server/mailer.js';
import { prisma } from '../src/lib/server/prisma.js';

useIsolatedDb();

/** @type {string} */
let clienteId;

beforeEach(async () => {
	setMailer(createAcceptingMailer());
	const c = await crearCliente(clienteInput({ nombre: 'Cliente Cot', correo: 'cot@t.test' }));
	clienteId = c.cliente.id;
});

function baseCot(overrides = {}) {
	return {
		clienteId,
		fecha: '2026-10-01',
		vencimiento: '2026-10-20',
		conceptos: [
			{ descripcion: 'Concepto A', cantidad: 2, precioUnitario: '1000' },
			{ descripcion: 'Concepto B', cantidad: 1, precioUnitario: '500' }
		],
		...overrides
	};
}

describe('AUD-P2 Cotizaciones', () => {
	it('AUD-P2-01 rechaza sin fecha emisión', () => {
		const r = parseCotizacionInput({ ...baseCot(), fecha: '' });
		expect(r.ok).toBe(false);
	});

	it('AUD-P2-02 rechaza sin vencimiento', () => {
		const r = parseCotizacionInput({ ...baseCot(), vencimiento: '' });
		expect(r.ok).toBe(false);
	});

	it('AUD-P2-03 rechaza vencimiento anterior', () => {
		const r = parseCotizacionInput({
			...baseCot(),
			fecha: '2026-10-10',
			vencimiento: '2026-10-01'
		});
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.fieldErrors.vencimiento).toBeTruthy();
	});

	it('AUD-P2-04 concepto sin descripción', () => {
		const r = parseCotizacionInput({
			...baseCot(),
			conceptos: [{ descripcion: '   ', cantidad: 1, precioUnitario: '10' }]
		});
		expect(r.ok).toBe(false);
	});

	it('AUD-P2-05 cantidad 1.37 rechazada', () => {
		expect(() => calcularTotales([{ descripcion: 'x', cantidad: 1.37, precioUnitario: '10' }])).toThrow(
			/entero/i
		);
		const r = parseCotizacionInput({
			...baseCot(),
			conceptos: [{ descripcion: 'Tacos', cantidad: 1.37, precioUnitario: '10' }]
		});
		expect(r.ok).toBe(false);
	});

	it('AUD-P2-06 cantidades inválidas y precios negativos', () => {
		for (const cantidad of [-2, 0, 'abc']) {
			const r = parseCotizacionInput({
				...baseCot(),
				conceptos: [{ descripcion: 'X', cantidad, precioUnitario: '10' }]
			});
			expect(r.ok).toBe(false);
		}
		const neg = parseCotizacionInput({
			...baseCot(),
			conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: '-10' }]
		});
		expect(neg.ok).toBe(false);
	});

	it('AUD-P2-07 totales exactos 2500 / 400 / 2900', async () => {
		const t = calcularTotales(baseCot().conceptos);
		expect(t.subtotal).toBe('2500.00');
		expect(t.iva).toBe('400.00');
		expect(t.total).toBe('2900.00');
		const cot = await crearCotizacion(baseCot());
		expect(cot.ok).toBe(true);
		expect(String(cot.cotizacion.total)).toMatch(/2900/);
	});

	it('AUD-P2-08 numeración concurrente sin repetir', async () => {
		const results = await Promise.all([
			crearCotizacion(baseCot()),
			crearCotizacion(baseCot()),
			crearCotizacion(baseCot())
		]);
		expect(results.every((r) => r.ok)).toBe(true);
		const numeros = results.map((r) => r.cotizacion.numero);
		expect(new Set(numeros).size).toBe(3);
	});

	it('AUD-P2-09 editar borrador y bloquear enviada', async () => {
		const cot = await crearCotizacion(baseCot());
		const edit = await actualizarBorrador(cot.cotizacion.id, {
			...baseCot(),
			conceptos: [{ descripcion: 'Editado', cantidad: 1, precioUnitario: '200' }]
		});
		expect(edit.ok).toBe(true);

		await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'u', userName: 'QA' });
		const blocked = await actualizarBorrador(cot.cotizacion.id, baseCot());
		expect(blocked.ok).toBe(false);
	});

	it('AUD-P2-10 reabrir rechazada con motivo e historial', async () => {
		const cot = await crearCotizacion(baseCot());
		await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'u', userName: 'QA' });
		await cambiarEstado(cot.cotizacion.id, 'RECHAZADA', { userId: 'u', userName: 'QA' });
		const noMotivo = await reabrirComoBorrador(cot.cotizacion.id, {
			userId: 'u',
			userName: 'QA',
			motivo: ''
		});
		expect(noMotivo.ok).toBe(false);
		const ok = await reabrirComoBorrador(cot.cotizacion.id, {
			userId: 'u',
			userName: 'QA',
			motivo: 'Cliente reconsideró'
		});
		expect(ok.ok).toBe(true);
		expect(ok.cotizacion.estado).toBe('BORRADOR');
		const hist = await prisma.historialCot.findMany({
			where: { cotizacionId: cot.cotizacion.id, estadoNuevo: 'BORRADOR' }
		});
		expect(hist.some((h) => h.nota?.includes('reconsideró'))).toBe(true);
	});

	it('AUD-P2-11 imposible marcar PAGADA sin pagos', async () => {
		const cot = await crearCotizacion(baseCot());
		await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'u' });
		await cambiarEstado(cot.cotizacion.id, 'APROBADA', { userId: 'u' });
		const r = await cambiarEstado(cot.cotizacion.id, 'PAGADA', { userId: 'u' });
		expect(r.ok).toBe(false);
		const fresh = await obtenerCotizacion(cot.cotizacion.id);
		expect(fresh.estado).not.toBe('PAGADA');
	});

	it('AUD-P2-12 fallo de correo no revierte ENVIADA', async () => {
		setMailer(createFailingMailer());
		const cot = await crearCotizacion(baseCot());
		const r = await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'u', userName: 'QA' });
		expect(r.ok).toBe(true);
		expect(r.avisoCorreo).toMatch(/correo no pudo/i);
		const fresh = await obtenerCotizacion(cot.cotizacion.id);
		expect(fresh.estado).toBe('ENVIADA');
		const notif = await prisma.notificacion.findFirst({
			where: { cotizacionId: cot.cotizacion.id }
		});
		expect(notif?.estado).toBe('FALLIDA');
		expect(JSON.stringify(fresh.historial)).not.toMatch(/TEST_FAIL|stack|sk_live/i);
	});
});
