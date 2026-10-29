import { describe, expect, it, beforeEach } from 'vitest';
import { useIsolatedDb, clienteInput, prisma } from './helpers/db.js';
import { crearCliente } from '../src/lib/server/clientes.js';
import { crearCotizacion, cambiarEstado } from '../src/lib/server/cotizaciones.js';
import { registrarPago } from '../src/lib/server/pagos.js';
import { obtenerCarteraPendiente, obtenerDashboard } from '../src/lib/server/finance.js';
import { setMailer, createAcceptingMailer } from '../src/lib/server/mailer.js';

useIsolatedDb();

/** @type {string} */
let clienteId;

const conceptos2900 = [
	{ descripcion: 'Concepto A', cantidad: 2, precioUnitario: '1000' },
	{ descripcion: 'Concepto B', cantidad: 1, precioUnitario: '500' }
];

async function cotizacionEnEstado(estado) {
	const cot = await crearCotizacion({
		clienteId,
		fecha: '2026-09-01',
		vencimiento: '2026-09-20',
		conceptos: conceptos2900
	});
	if (!cot.ok) throw new Error('create fail');
	const id = cot.cotizacion.id;
	if (estado === 'BORRADOR') return id;
	await cambiarEstado(id, 'ENVIADA', { userId: 'u' });
	if (estado === 'ENVIADA') return id;
	if (estado === 'RECHAZADA') {
		await cambiarEstado(id, 'RECHAZADA', { userId: 'u' });
		return id;
	}
	await cambiarEstado(id, 'APROBADA', { userId: 'u' });
	if (estado === 'APROBADA') return id;
	await cambiarEstado(id, 'FACTURADA', { userId: 'u' });
	return id;
}

beforeEach(async () => {
	setMailer(createAcceptingMailer());
	const c = await crearCliente(clienteInput({ nombre: 'Cliente Pagos', correo: 'pagos@t.test' }));
	clienteId = c.cliente.id;
});

describe('AUD-P3 Pagos', () => {
	it('AUD-P3 flujo parcial/total y rechazos', async () => {
		const id = await cotizacionEnEstado('APROBADA');
		const p1 = await registrarPago(
			id,
			{ monto: '1000', fecha: '2026-09-05', metodo: 'TRANSFERENCIA', idempotencyKey: 'p1' },
			{ userId: 'u' }
		);
		expect(p1.ok).toBe(true);
		let cot = await prisma.cotizacion.findUnique({ where: { id }, include: { pagos: true } });
		const pagado1 = cot.pagos.reduce((a, p) => a + Number(p.monto), 0);
		expect(pagado1).toBe(1000);
		expect(2900 - pagado1).toBe(1900);

		const idFact = await cotizacionEnEstado('FACTURADA');
		const pf = await registrarPago(
			idFact,
			{ monto: '100', fecha: '2026-09-05', metodo: 'EFECTIVO', idempotencyKey: 'pf' },
			{ userId: 'u' }
		);
		expect(pf.ok).toBe(true);

		const early = await registrarPago(id, {
			monto: '10',
			fecha: '2026-08-01',
			metodo: 'EFECTIVO'
		});
		expect(early.ok).toBe(false);

		const over = await registrarPago(id, {
			monto: '3000',
			fecha: '2026-09-06',
			metodo: 'EFECTIVO'
		});
		expect(over.ok).toBe(false);

		const zero = await registrarPago(id, { monto: '0', fecha: '2026-09-06', metodo: 'EFECTIVO' });
		expect(zero.ok).toBe(false);
		const neg = await registrarPago(id, { monto: '-5', fecha: '2026-09-06', metodo: 'EFECTIVO' });
		expect(neg.ok).toBe(false);

		const p2 = await registrarPago(
			id,
			{ monto: '1900', fecha: '2026-09-07', metodo: 'TARJETA', idempotencyKey: 'p2' },
			{ userId: 'u' }
		);
		expect(p2.ok).toBe(true);
		cot = await prisma.cotizacion.findUnique({ where: { id }, include: { historial: true } });
		expect(cot.estado).toBe('PAGADA');
		expect(cot.historial.some((h) => h.estadoNuevo === 'PAGADA')).toBe(true);

		const cartera = await obtenerCarteraPendiente();
		expect(cartera.items.find((i) => i.id === id)).toBeFalsy();
	});

	it('AUD-P3 rechaza pagos en BORRADOR/ENVIADA/RECHAZADA', async () => {
		for (const estado of ['BORRADOR', 'ENVIADA', 'RECHAZADA']) {
			const id = await cotizacionEnEstado(estado);
			const r = await registrarPago(id, {
				monto: '100',
				fecha: '2026-09-05',
				metodo: 'EFECTIVO'
			});
			expect(r.ok).toBe(false);
		}
	});

	it('AUD-P3 pagos concurrentes no exceden saldo', async () => {
		const id = await cotizacionEnEstado('APROBADA');
		const results = await Promise.all([
			registrarPago(id, {
				monto: '1900',
				fecha: '2026-09-05',
				metodo: 'EFECTIVO',
				idempotencyKey: 'c1'
			}),
			registrarPago(id, {
				monto: '1900',
				fecha: '2026-09-05',
				metodo: 'EFECTIVO',
				idempotencyKey: 'c2'
			}),
			registrarPago(id, {
				monto: '1900',
				fecha: '2026-09-05',
				metodo: 'EFECTIVO',
				idempotencyKey: 'c3'
			})
		]);
		const ok = results.filter((r) => r.ok);
		expect(ok.length).toBeLessThanOrEqual(1);
		const cot = await prisma.cotizacion.findUnique({ where: { id }, include: { pagos: true } });
		const sum = cot.pagos.reduce((a, p) => a + Number(p.monto), 0);
		expect(sum).toBeLessThanOrEqual(2900);
	});
});

describe('AUD-P4 Cobranza', () => {
	it('AUD-P4 aparece/desaparece y filtros de estado', async () => {
		const aprobada = await cotizacionEnEstado('APROBADA');
		let cartera = await obtenerCarteraPendiente();
		expect(cartera.items.find((i) => i.id === aprobada)).toBeTruthy();
		expect(Number(cartera.carteraPendiente)).toBe(2900);

		await registrarPago(aprobada, {
			monto: '1000',
			fecha: '2026-09-05',
			metodo: 'EFECTIVO',
			idempotencyKey: 'cob1'
		});
		cartera = await obtenerCarteraPendiente();
		const item = cartera.items.find((i) => i.id === aprobada);
		expect(item?.pendiente).toBe('1900.00');

		await registrarPago(aprobada, {
			monto: '1900',
			fecha: '2026-09-06',
			metodo: 'EFECTIVO',
			idempotencyKey: 'cob2'
		});
		cartera = await obtenerCarteraPendiente();
		expect(cartera.items.find((i) => i.id === aprobada)).toBeFalsy();

		const fact = await cotizacionEnEstado('FACTURADA');
		cartera = await obtenerCarteraPendiente();
		expect(cartera.items.find((i) => i.id === fact)).toBeTruthy();

		const borrador = await cotizacionEnEstado('BORRADOR');
		const enviada = await cotizacionEnEstado('ENVIADA');
		const rechazada = await cotizacionEnEstado('RECHAZADA');
		cartera = await obtenerCarteraPendiente();
		expect(cartera.items.find((i) => i.id === borrador)).toBeFalsy();
		expect(cartera.items.find((i) => i.id === enviada)).toBeFalsy();
		expect(cartera.items.find((i) => i.id === rechazada)).toBeFalsy();

		const sum = cartera.items.reduce((a, i) => a + Number(i.pendiente), 0);
		expect(Number(cartera.carteraPendiente)).toBeCloseTo(sum, 2);
	});

	it('AUD-P4 alerta roja >30 días', async () => {
		const id = await cotizacionEnEstado('APROBADA');
		await prisma.cotizacion.update({
			where: { id },
			data: { fecha: new Date('2026-01-01T12:00:00Z') }
		});
		const cartera = await obtenerCarteraPendiente();
		const item = cartera.items.find((i) => i.id === id);
		expect(item?.alerta).toBe('roja');
		expect(item?.dias).toBeGreaterThan(30);
	});
});

describe('AUD-P5 Dashboard', () => {
	it('AUD-P5 facturado solo con facturadaEn; cobrado por pagos', async () => {
		const cot = await crearCotizacion({
			clienteId,
			fecha: '2026-10-05',
			vencimiento: '2026-10-20',
			conceptos: conceptos2900
		});
		const id = cot.cotizacion.id;

		let dash = await obtenerDashboard();
		const fact0 = Number(dash.kpis.facturadoMes);

		await cambiarEstado(id, 'ENVIADA', { userId: 'u' });
		dash = await obtenerDashboard();
		expect(Number(dash.kpis.facturadoMes)).toBe(fact0);

		await cambiarEstado(id, 'APROBADA', { userId: 'u' });
		dash = await obtenerDashboard();
		expect(Number(dash.kpis.facturadoMes)).toBe(fact0);

		await cambiarEstado(id, 'FACTURADA', { userId: 'u' });
		// Asegurar facturadaEn en mes actual de la lógica (UTC)
		await prisma.cotizacion.update({
			where: { id },
			data: { facturadaEn: new Date() }
		});
		dash = await obtenerDashboard();
		expect(Number(dash.kpis.facturadoMes)).toBe(fact0 + 2900);

		await registrarPago(id, {
			monto: '1000',
			fecha: new Date().toISOString().slice(0, 10),
			metodo: 'EFECTIVO',
			idempotencyKey: 'd1'
		});
		dash = await obtenerDashboard();
		expect(Number(dash.kpis.cobradoMes)).toBeGreaterThanOrEqual(1000);
		expect(Number(dash.kpis.carteraPendiente)).toBe(1900);

		await registrarPago(id, {
			monto: '1900',
			fecha: new Date().toISOString().slice(0, 10),
			metodo: 'EFECTIVO',
			idempotencyKey: 'd2'
		});
		const final = await prisma.cotizacion.findUnique({ where: { id } });
		expect(final.estado).toBe('PAGADA');
		dash = await obtenerDashboard();
		expect(Number(dash.kpis.carteraPendiente)).toBe(0);
		// Facturado se conserva tras PAGADA
		expect(Number(dash.kpis.facturadoMes)).toBe(fact0 + 2900);
	});

	it('AUD-P5 APROBADA liquidada sin FACTURADA: cobrado sí, facturado no', async () => {
		const id = await cotizacionEnEstado('APROBADA');
		const before = await obtenerDashboard();
		const factBefore = Number(before.kpis.facturadoMes);
		await registrarPago(id, {
			monto: '2900',
			fecha: new Date().toISOString().slice(0, 10),
			metodo: 'TRANSFERENCIA',
			idempotencyKey: 'liq'
		});
		const after = await obtenerDashboard();
		expect(Number(after.kpis.facturadoMes)).toBe(factBefore);
		expect(Number(after.kpis.cobradoMes)).toBeGreaterThanOrEqual(Number(before.kpis.cobradoMes) + 2900);
		const row = await prisma.cotizacion.findUnique({ where: { id } });
		expect(row.facturadaEn).toBeNull();
		expect(row.estado).toBe('PAGADA');
	});
});
