import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

process.env.DATABASE_URL =
	process.env.DATABASE_URL ||
	'postgresql://postgres:postgres@127.0.0.1:5432/gestorpyme_test?schema=public';

export const prisma = new PrismaClient();

/**
 * Limpia tablas de negocio preservando migraciones.
 */
export async function resetDatabase() {
	await prisma.$executeRawUnsafe(`
		TRUNCATE TABLE
			"IdempotencyKey",
			"TokenPublico",
			"Notificacion",
			"HistorialCot",
			"Pago",
			"Concepto",
			"Cotizacion",
			"Cliente",
			"ContadorCotizacion"
		RESTART IDENTITY CASCADE;
	`);
	await prisma.configDespacho.upsert({
		where: { id: 'default' },
		create: { id: 'default', nombre: 'Despacho Auditoria' },
		update: { nombre: 'Despacho Auditoria' }
	});
}

export function useIsolatedDb() {
	beforeAll(async () => {
		await prisma.$connect();
	});
	beforeEach(async () => {
		await resetDatabase();
	});
	afterAll(async () => {
		await prisma.$disconnect();
	});
}

/**
 * @param {Partial<{ nombre: string, correo: string, telefono: string, empresa: string, rfc: string }>} overrides
 */
export function clienteInput(overrides = {}) {
	const n = overrides.nombre || `Cliente ${Math.random().toString(36).slice(2, 8)}`;
	return {
		nombre: n,
		correo: overrides.correo || `${n.replace(/\s+/g, '.').toLowerCase()}@ejemplo.test`,
		telefono: overrides.telefono ?? '6141234567',
		empresa: overrides.empresa ?? 'Empresa Test',
		rfc: overrides.rfc ?? null,
		direccion: '',
		notas: ''
	};
}
