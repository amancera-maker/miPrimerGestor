import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buscarClientesActivos, listarClientes } from '../src/lib/server/clientes.js';
import { normalizeNombre } from '../src/lib/server/normalize.js';

const prisma = new PrismaClient();

describe('AUD-P7 Rendimiento búsqueda 5000 clientes', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL =
			'postgresql://postgres:postgres@127.0.0.1:5432/gestorpyme_test?schema=public';
		await prisma.$executeRawUnsafe(`
			TRUNCATE TABLE
				"IdempotencyKey","TokenPublico","Notificacion","HistorialCot",
				"Pago","Concepto","Cotizacion","Cliente","ContadorCotizacion"
			RESTART IDENTITY CASCADE;
		`);
		const batchSize = 500;
		for (let b = 0; b < 10; b++) {
			/** @type {any[]} */
			const rows = [];
			for (let i = 0; i < batchSize; i++) {
				const n = b * batchSize + i;
				const nombre = `Cliente Perf ${String(n).padStart(4, '0')}`;
				const norm = normalizeNombre(nombre);
				rows.push({
					nombre,
					nombreNormalizado: norm,
					nombreClaveActiva: norm,
					empresa: n % 17 === 0 ? 'Empresa Buscable XYZ' : `Empresa ${n % 50}`,
					rfc: n % 23 === 0 ? `PERF${String(n).padStart(9, '0')}`.slice(0, 12) : null,
					correo: `perf${n}@ejemplo.test`,
					activo: true
				});
			}
			await prisma.cliente.createMany({ data: rows });
		}
		// Marca especial
		const specialNorm = normalizeNombre('Zeta Objetivo Search');
		await prisma.cliente.create({
			data: {
				nombre: 'Zeta Objetivo Search',
				nombreNormalizado: specialNorm,
				nombreClaveActiva: specialNorm,
				empresa: 'Empresa Buscable XYZ',
				rfc: 'OBJX800101AB1',
				correo: 'objetivo@ejemplo.test',
				activo: true
			}
		});
	}, 180000);

	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('AUD-P7-01 total ~5000 y listado pagina 20', async () => {
		const total = await prisma.cliente.count();
		expect(total).toBeGreaterThanOrEqual(5000);
		const t0 = Date.now();
		const page = await listarClientes({ page: 1, q: '' });
		const ms = Date.now() - t0;
		expect(page.items.length).toBe(20);
		expect(ms).toBeLessThan(2000);
	});

	it('AUD-P7-02 búsqueda nombre/empresa/RFC paginada sin traer 5000', async () => {
		const byName = await buscarClientesActivos('Zeta Objetivo', 1);
		expect(byName.items.length).toBeGreaterThanOrEqual(1);
		expect(byName.items.length).toBeLessThanOrEqual(20);
		expect(byName.items.some((c) => c.nombre.includes('Zeta Objetivo'))).toBe(true);

		const byEmpresa = await buscarClientesActivos('Empresa Buscable XYZ', 1);
		expect(byEmpresa.items.length).toBeLessThanOrEqual(20);
		expect(byEmpresa.items.every((c) => (c.empresa || '').includes('Buscable') || c.nombre.includes('Zeta'))).toBe(
			true
		);

		const byRfc = await buscarClientesActivos('OBJX800101AB1', 1);
		expect(byRfc.items.some((c) => c.rfc === 'OBJX800101AB1')).toBe(true);
	});
});
