import { describe, expect, it, beforeEach } from 'vitest';
import { useIsolatedDb, clienteInput, prisma } from './helpers/db.js';
import { crearCliente } from '../src/lib/server/clientes.js';
import {
	crearCotizacion,
	cambiarEstado,
	actualizarBorrador,
	obtenerCotizacion
} from '../src/lib/server/cotizaciones.js';
import { registrarPago } from '../src/lib/server/pagos.js';
import { crearTokenPublico, resolverTokenPublico } from '../src/lib/server/tokens.js';
import { setMailer, createAcceptingMailer } from '../src/lib/server/mailer.js';
import { randomBytes } from 'node:crypto';

useIsolatedDb();

describe('AUD-P9 Seguridad servidor', () => {
	beforeEach(() => setMailer(createAcceptingMailer()));

	it('AUD-P9-01 bloquea pago en borrador vía API servidor', async () => {
		const c = await crearCliente(clienteInput({ nombre: 'Seg Cliente', correo: 'seg@t.test' }));
		const cot = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: '100' }]
		});
		const r = await registrarPago(cot.cotizacion.id, {
			monto: '50',
			fecha: '2026-10-02',
			metodo: 'EFECTIVO'
		});
		expect(r.ok).toBe(false);
	});

	it('AUD-P9-02 bloquea PAGADA forzada', async () => {
		const c = await crearCliente(clienteInput({ nombre: 'Seg Pagada', correo: 'seg2@t.test' }));
		const cot = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: '100' }]
		});
		await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'attacker' });
		await cambiarEstado(cot.cotizacion.id, 'APROBADA', { userId: 'attacker' });
		const r = await cambiarEstado(cot.cotizacion.id, 'PAGADA', { userId: 'attacker' });
		expect(r.ok).toBe(false);
		const fresh = await obtenerCotizacion(cot.cotizacion.id);
		expect(fresh.estado).toBe('APROBADA');
	});

	it('AUD-P9-03 bloquea edición de cotización ENVIADA', async () => {
		const c = await crearCliente(clienteInput({ nombre: 'Seg Edit', correo: 'seg3@t.test' }));
		const cot = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: '100' }]
		});
		await cambiarEstado(cot.cotizacion.id, 'ENVIADA', { userId: 'u' });
		const r = await actualizarBorrador(cot.cotizacion.id, {
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'Hack', cantidad: 1, precioUnitario: '1' }]
		});
		expect(r.ok).toBe(false);
	});

	it('AUD-P9-04 token público no adivinable ni cruza cotizaciones', async () => {
		const c = await crearCliente(clienteInput({ nombre: 'Seg Token', correo: 'seg4@t.test' }));
		const a = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'Privada A', cantidad: 1, precioUnitario: '100' }]
		});
		const b = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-10',
			conceptos: [{ descripcion: 'Privada B', cantidad: 1, precioUnitario: '200' }]
		});
		const tokenA = await crearTokenPublico(a.cotizacion.id);
		const resolved = await resolverTokenPublico(tokenA);
		expect(resolved?.id).toBe(a.cotizacion.id);
		expect(resolved?.conceptos[0].descripcion).toBe('Privada A');

		const guess = randomBytes(32).toString('base64url');
		expect(await resolverTokenPublico(guess)).toBeNull();
		expect(await resolverTokenPublico(b.cotizacion.id)).toBeNull();
		expect(await resolverTokenPublico('')).toBeNull();
	});

	it('AUD-P9-05 duplicados de cliente bloqueados en servidor', async () => {
		await crearCliente(clienteInput({ nombre: 'Unico Seg', correo: 'u1@t.test' }));
		const r = await crearCliente(clienteInput({ nombre: 'unico seg', correo: 'u2@t.test' }));
		expect(r.ok).toBe(false);
		expect(await prisma.cliente.count()).toBe(1);
	});
});
