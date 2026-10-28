import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { parseCliente } from './validators.js';
import { logError } from './logger.js';

/**
 * @param {URLSearchParams | { q?: string, page?: number, inactivos?: boolean }} params
 */
export async function listarClientes(params) {
	const q = (params instanceof URLSearchParams ? params.get('q') : params.q) || '';
	const page = Math.max(
		1,
		Number(params instanceof URLSearchParams ? params.get('page') : params.page) || 1
	);
	const inactivos =
		(params instanceof URLSearchParams ? params.get('inactivos') : params.inactivos) === '1' ||
		(params instanceof URLSearchParams ? params.get('inactivos') : params.inactivos) === true;
	const take = 20;
	const skip = (page - 1) * take;

	/** @type {import('@prisma/client').Prisma.ClienteWhereInput} */
	const where = {
		activo: inactivos ? undefined : true
	};
	if (inactivos) {
		// mostrar todos si toggle, o solo inactivos? Spec: toggle "Mostrar inactivos"
		// Interpretación: por defecto activos; con toggle incluye inactivos (todos)
		delete where.activo;
	}
	if (q.trim()) {
		where.OR = [
			{ nombre: { contains: q.trim(), mode: 'insensitive' } },
			{ empresa: { contains: q.trim(), mode: 'insensitive' } },
			{ rfc: { contains: q.trim().toUpperCase(), mode: 'insensitive' } }
		];
	}

	const [total, items] = await Promise.all([
		prisma.cliente.count({ where }),
		prisma.cliente.findMany({
			where,
			orderBy: { nombre: 'asc' },
			skip,
			take
		})
	]);

	return {
		items,
		page,
		pageSize: take,
		total,
		totalPages: Math.max(1, Math.ceil(total / take)),
		q,
		inactivos
	};
}

/**
 * @param {unknown} input
 * @param {{ idempotencyKey?: string | null }} [opts]
 */
export async function crearCliente(input, opts = {}) {
	const parsed = parseCliente(input);
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

	if (opts.idempotencyKey) {
		const existing = await prisma.idempotencyKey.findUnique({ where: { clave: opts.idempotencyKey } });
		if (existing?.recursoId) {
			const cli = await prisma.cliente.findUnique({ where: { id: existing.recursoId } });
			if (cli) return { ok: true, cliente: cli, idempotent: true };
		}
	}

	const data = parsed.data;
	try {
		const cliente = await prisma.$transaction(async (tx) => {
			const dupNombre = await tx.cliente.findFirst({
				where: { nombreClaveActiva: data.nombreNormalizado }
			});
			if (dupNombre) {
				const err = new Error('DUPLICATE_NOMBRE');
				/** @type {any} */ (err).code = 'DUPLICATE_NOMBRE';
				throw err;
			}
			if (data.rfc) {
				const dupRfc = await tx.cliente.findFirst({ where: { rfc: data.rfc } });
				if (dupRfc) {
					const err = new Error('DUPLICATE_RFC');
					/** @type {any} */ (err).code = 'DUPLICATE_RFC';
					throw err;
				}
			}
			const created = await tx.cliente.create({
				data: {
					...data,
					activo: true,
					nombreClaveActiva: data.nombreNormalizado
				}
			});
			if (opts.idempotencyKey) {
				await tx.idempotencyKey.create({
					data: {
						clave: opts.idempotencyKey,
						recurso: 'cliente',
						recursoId: created.id,
						respuesta: { id: created.id }
					}
				});
			}
			return created;
		});
		return { ok: true, cliente };
	} catch (e) {
		const code = /** @type {any} */ (e)?.code;
		if (code === 'DUPLICATE_NOMBRE' || code === 'P2002') {
			const target = /** @type {any} */ (e)?.meta?.target;
			if (code === 'DUPLICATE_RFC' || (Array.isArray(target) && target.includes('rfc'))) {
				return {
					ok: false,
					fieldErrors: { rfc: 'Ya existe un cliente con este RFC' }
				};
			}
			return {
				ok: false,
				fieldErrors: {
					nombre:
						'Ya existe un cliente activo con este nombre. Usa el registro existente o distingue claramente la identidad (p. ej. segundo apellido).'
				}
			};
		}
		if (code === 'DUPLICATE_RFC') {
			return { ok: false, fieldErrors: { rfc: 'Ya existe un cliente con este RFC' } };
		}
		logError('crearCliente', e);
		return { ok: false, fieldErrors: { _form: 'No se pudo registrar el cliente. Intenta nuevamente.' } };
	}
}

/**
 * @param {string} id
 * @param {unknown} input
 */
export async function actualizarCliente(id, input) {
	const parsed = parseCliente(input);
	if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
	const data = parsed.data;

	try {
		const actual = await prisma.cliente.findUnique({ where: { id } });
		if (!actual) return { ok: false, fieldErrors: { _form: 'Cliente no encontrado' } };

		const cliente = await prisma.$transaction(async (tx) => {
			if (actual.activo) {
				const dupNombre = await tx.cliente.findFirst({
					where: {
						nombreClaveActiva: data.nombreNormalizado,
						NOT: { id }
					}
				});
				if (dupNombre) {
					const err = new Error('DUPLICATE_NOMBRE');
					/** @type {any} */ (err).code = 'DUPLICATE_NOMBRE';
					throw err;
				}
			}
			if (data.rfc) {
				const dupRfc = await tx.cliente.findFirst({
					where: { rfc: data.rfc, NOT: { id } }
				});
				if (dupRfc) {
					const err = new Error('DUPLICATE_RFC');
					/** @type {any} */ (err).code = 'DUPLICATE_RFC';
					throw err;
				}
			}
			return tx.cliente.update({
				where: { id },
				data: {
					...data,
					nombreClaveActiva: actual.activo ? data.nombreNormalizado : null
				}
			});
		});
		return { ok: true, cliente };
	} catch (e) {
		const code = /** @type {any} */ (e)?.code;
		if (code === 'DUPLICATE_NOMBRE' || code === 'P2002') {
			return {
				ok: false,
				fieldErrors: {
					nombre:
						'Ya existe un cliente activo con este nombre. Usa el registro existente o distingue la identidad.'
				}
			};
		}
		if (code === 'DUPLICATE_RFC') {
			return { ok: false, fieldErrors: { rfc: 'Ya existe un cliente con este RFC' } };
		}
		logError('actualizarCliente', e);
		return { ok: false, fieldErrors: { _form: 'No se pudo actualizar el cliente.' } };
	}
}

/**
 * @param {string} id
 * @param {boolean} activo
 */
export async function setClienteActivo(id, activo) {
	const actual = await prisma.cliente.findUnique({ where: { id } });
	if (!actual) return { ok: false, message: 'Cliente no encontrado' };

	if (activo) {
		const dup = await prisma.cliente.findFirst({
			where: { nombreClaveActiva: actual.nombreNormalizado, NOT: { id } }
		});
		if (dup) {
			return {
				ok: false,
				message:
					'No se puede reactivar: ya existe otro cliente activo con el mismo nombre normalizado.'
			};
		}
	}

	try {
		const cliente = await prisma.cliente.update({
			where: { id },
			data: {
				activo,
				nombreClaveActiva: activo ? actual.nombreNormalizado : null
			}
		});
		return { ok: true, cliente };
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			return {
				ok: false,
				message: 'Conflicto de unicidad al reactivar el cliente.'
			};
		}
		logError('setClienteActivo', e);
		return { ok: false, message: 'No se pudo actualizar el estado del cliente.' };
	}
}

/**
 * Combobox de clientes activos
 * @param {string} q
 * @param {number} [page]
 */
export async function buscarClientesActivos(q, page = 1) {
	const take = 20;
	const skip = (Math.max(1, page) - 1) * take;
	const where = {
		activo: true,
		...(q.trim()
			? {
					OR: [
						{ nombre: { contains: q.trim(), mode: 'insensitive' } },
						{ empresa: { contains: q.trim(), mode: 'insensitive' } },
						{ rfc: { contains: q.trim().toUpperCase(), mode: 'insensitive' } }
					]
				}
			: {})
	};
	const [total, items] = await Promise.all([
		prisma.cliente.count({ where }),
		prisma.cliente.findMany({
			where,
			orderBy: { nombre: 'asc' },
			skip,
			take,
			select: { id: true, nombre: true, empresa: true, rfc: true, correo: true }
		})
	]);
	return { items, total, page, hasMore: skip + items.length < total };
}
