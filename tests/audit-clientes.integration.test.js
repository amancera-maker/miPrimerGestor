import { describe, expect, it } from 'vitest';
import { useIsolatedDb, prisma, clienteInput } from './helpers/db.js';
import {
	crearCliente,
	actualizarCliente,
	setClienteActivo,
	listarClientes,
	buscarClientesActivos
} from '../src/lib/server/clientes.js';
import { crearCotizacion } from '../src/lib/server/cotizaciones.js';
import { parseCliente } from '../src/lib/server/validators.js';
import { setMailer, createAcceptingMailer } from '../src/lib/server/mailer.js';

useIsolatedDb();

describe('AUD-P1 Clientes', () => {
	it('AUD-P1-01 rechaza teléfono con letras hola123', async () => {
		const parsed = parseCliente(clienteInput({ telefono: 'hola123' }));
		expect(parsed.ok).toBe(false);
		if (!parsed.ok) expect(parsed.fieldErrors.telefono).toMatch(/letras/i);

		const r = await crearCliente(clienteInput({ telefono: 'hola123' }));
		expect(r.ok).toBe(false);
	});

	it('AUD-P1-02/03 impide duplicados Juan Pérez por normalización', async () => {
		setMailer(createAcceptingMailer());
		const a = await crearCliente(clienteInput({ nombre: 'Juan Pérez', correo: 'a@ejemplo.test' }));
		expect(a.ok).toBe(true);

		const b = await crearCliente(clienteInput({ nombre: 'Juan Pérez', correo: 'b@ejemplo.test' }));
		expect(b.ok).toBe(false);

		const c = await crearCliente(
			clienteInput({ nombre: ' JUAN   PÉREZ ', correo: 'c@ejemplo.test' })
		);
		expect(c.ok).toBe(false);

		const d = await crearCliente(clienteInput({ nombre: 'juan perez', correo: 'd@ejemplo.test' }));
		expect(d.ok).toBe(false);

		const count = await prisma.cliente.count({ where: { activo: true } });
		expect(count).toBe(1);
	});

	it('AUD-P1-04 rechaza editar nombre hacia duplicado', async () => {
		const a = await crearCliente(clienteInput({ nombre: 'Ana López', correo: 'ana@t.test' }));
		const b = await crearCliente(clienteInput({ nombre: 'Luis Soto', correo: 'luis@t.test' }));
		expect(a.ok && b.ok).toBe(true);
		const upd = await actualizarCliente(b.cliente.id, {
			...clienteInput({ nombre: 'Ana López', correo: 'luis@t.test' })
		});
		expect(upd.ok).toBe(false);
		if (!upd.ok) expect(upd.fieldErrors.nombre).toBeTruthy();
	});

	it('AUD-P1-05 tres envíos con misma idempotencyKey = un registro', async () => {
		const key = 'idem-cliente-triple';
		const input = clienteInput({ nombre: 'María Idem', correo: 'maria.idem@t.test' });
		const results = [];
		for (let i = 0; i < 3; i++) {
			results.push(await crearCliente(input, { idempotencyKey: key }));
		}
		expect(results.every((r) => r.ok)).toBe(true);
		const ids = new Set(results.map((r) => r.cliente.id));
		expect(ids.size).toBe(1);
		expect(await prisma.cliente.count()).toBe(1);
	});

	it('AUD-P1-06 tres peticiones simultáneas no duplican', async () => {
		const input = clienteInput({ nombre: 'Concurrente Uno', correo: 'conc@t.test' });
		const results = await Promise.all([
			crearCliente(input),
			crearCliente({ ...input, correo: 'conc2@t.test' }),
			crearCliente({ ...input, correo: 'conc3@t.test' })
		]);
		const ok = results.filter((r) => r.ok);
		const fail = results.filter((r) => !r.ok);
		expect(ok.length).toBe(1);
		expect(fail.length).toBe(2);
		expect(await prisma.cliente.count({ where: { activo: true } })).toBe(1);
	});

	it('AUD-P1-07 desactivar y reactivar', async () => {
		const a = await crearCliente(clienteInput({ nombre: 'Activo Test', correo: 'act@t.test' }));
		const off = await setClienteActivo(a.cliente.id, false);
		expect(off.ok).toBe(true);
		expect(off.cliente.activo).toBe(false);
		const listDefault = await listarClientes({ page: 1 });
		expect(listDefault.items.find((c) => c.id === a.cliente.id)).toBeFalsy();
		const on = await setClienteActivo(a.cliente.id, true);
		expect(on.ok).toBe(true);
		expect(on.cliente.activo).toBe(true);
	});

	it('AUD-P1-08 no cotiza cliente inactivo', async () => {
		const a = await crearCliente(clienteInput({ nombre: 'Inactivo Cot', correo: 'inac@t.test' }));
		await setClienteActivo(a.cliente.id, false);
		const cot = await crearCotizacion({
			clienteId: a.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-15',
			conceptos: [{ descripcion: 'X', cantidad: 1, precioUnitario: '100' }]
		});
		expect(cot.ok).toBe(false);
		if (!cot.ok) expect(cot.fieldErrors.clienteId).toMatch(/activo/i);
	});

	it('AUD-P1-09 paginación 20 y búsqueda', async () => {
		const rows = Array.from({ length: 45 }, (_, i) => ({
			nombre: `Pagina Cliente ${String(i).padStart(3, '0')}`,
			nombreNormalizado: `pagina cliente ${String(i).padStart(3, '0')}`,
			nombreClaveActiva: `pagina cliente ${String(i).padStart(3, '0')}`,
			correo: `pag${i}@t.test`,
			empresa: i % 2 === 0 ? 'Acme Search' : 'Otra SA',
			rfc: null,
			activo: true
		}));
		await prisma.cliente.createMany({ data: rows });
		const p1 = await listarClientes({ page: 1 });
		expect(p1.items.length).toBe(20);
		expect(p1.totalPages).toBeGreaterThanOrEqual(3);
		const search = await listarClientes({ q: 'Acme Search', page: 1 });
		expect(search.items.every((c) => c.empresa === 'Acme Search')).toBe(true);
		const combo = await buscarClientesActivos('Acme', 1);
		expect(combo.items.length).toBeLessThanOrEqual(20);
		expect(combo.hasMore || combo.total > combo.items.length || combo.total <= 20).toBe(true);
	});
});
