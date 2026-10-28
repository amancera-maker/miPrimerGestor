import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';

/**
 * @param {string} token
 */
export function hashToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

/**
 * @param {string} cotizacionId
 * @param {number} [dias]
 */
export async function crearTokenPublico(cotizacionId, dias = 30) {
	const token = randomBytes(32).toString('base64url');
	const tokenHash = hashToken(token);
	const expiraEn = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
	await prisma.tokenPublico.create({
		data: { cotizacionId, tokenHash, expiraEn }
	});
	return token;
}

/**
 * @param {string} token
 */
export async function resolverTokenPublico(token) {
	if (!token || token.length < 20) return null;
	const tokenHash = hashToken(token);
	const row = await prisma.tokenPublico.findUnique({
		where: { tokenHash },
		include: {
			cotizacion: {
				include: {
					cliente: true,
					conceptos: { orderBy: { orden: 'asc' } }
				}
			}
		}
	});
	if (!row) return null;
	if (row.expiraEn.getTime() < Date.now()) return null;
	return row.cotizacion;
}
