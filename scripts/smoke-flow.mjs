import { PrismaClient, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { createHash, randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function money(v) {
	return new Decimal(v);
}
function toMoney(v) {
	return money(v).toFixed(2);
}
function normalizeNombre(value) {
	return String(value ?? '')
		.normalize('NFC')
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
}

async function main() {
	console.log('== Smoke flow GestorPyme ==');

	const nombre = 'Carlos Mendoza';
	const nombreNormalizado = normalizeNombre(nombre);
	const cliente = await prisma.cliente.create({
		data: {
			nombre,
			nombreNormalizado,
			nombreClaveActiva: nombreNormalizado,
			empresa: 'Despacho Demo',
			correo: 'carlos@ejemplo.mx',
			telefono: '+52 614 123 4567',
			telefonoNormalizado: '+526141234567',
			rfc: 'MOMC800101ABC',
			activo: true
		}
	});
	console.log('Cliente OK', cliente.id);

	try {
		await prisma.cliente.create({
			data: {
				nombre: 'Carlos Mendoza',
				nombreNormalizado,
				nombreClaveActiva: nombreNormalizado,
				correo: 'otro@ejemplo.mx',
				activo: true
			}
		});
		throw new Error('Debió fallar duplicado');
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			console.log('Duplicado bloqueado OK');
		} else if (String(e.message).includes('Debió')) {
			throw e;
		} else {
			console.log('Duplicado bloqueado OK');
		}
	}

	const subtotal = money(3000);
	const iva = subtotal.mul('0.16').toDecimalPlaces(2);
	const total = subtotal.plus(iva);
	const anio = 2026;
	const contador = await prisma.contadorCotizacion.upsert({
		where: { anio },
		create: { anio, siguiente: 2 },
		update: { siguiente: { increment: 1 } }
	});
	const numero = `COT-${anio}-${String(contador.siguiente - 1).padStart(3, '0')}`;

	const cot = await prisma.cotizacion.create({
		data: {
			numero,
			clienteId: cliente.id,
			estado: 'BORRADOR',
			fecha: new Date('2026-10-01T12:00:00Z'),
			vencimiento: new Date('2026-10-20T12:00:00Z'),
			subtotal: toMoney(subtotal),
			iva: toMoney(iva),
			total: toMoney(total),
			conceptos: {
				create: [
					{
						descripcion: 'Consultoría fiscal',
						cantidad: 2,
						precioUnitario: '1500.00',
						subtotal: '3000.00',
						orden: 0
					}
				]
			},
			historial: {
				create: { estadoNuevo: 'BORRADOR', nota: 'creada' }
			}
		}
	});
	console.log('Cotización', cot.numero, toMoney(total));

	await prisma.cotizacion.update({
		where: { id: cot.id },
		data: { estado: 'ENVIADA' }
	});
	await prisma.cotizacion.update({
		where: { id: cot.id },
		data: { estado: 'APROBADA' }
	});
	await prisma.cotizacion.update({
		where: { id: cot.id },
		data: { estado: 'FACTURADA', facturadaEn: new Date('2026-10-03T12:00:00Z') }
	});
	console.log('Estados OK → FACTURADA');

	await prisma.pago.create({
		data: {
			cotizacionId: cot.id,
			monto: '1000.00',
			fecha: new Date('2026-10-05T12:00:00Z'),
			metodo: 'TRANSFERENCIA',
			idempotencyKey: randomUUID()
		}
	});

	const pagos = await prisma.pago.findMany({ where: { cotizacionId: cot.id } });
	let pagado = money(0);
	for (const p of pagos) pagado = pagado.plus(p.monto);
	let pendiente = money(cot.total).minus(pagado);
	if (!(pendiente.gt(0))) throw new Error('Debe haber pendiente');
	console.log('Parcial OK pendiente', toMoney(pendiente));

	await prisma.pago.create({
		data: {
			cotizacionId: cot.id,
			monto: toMoney(pendiente),
			fecha: new Date('2026-10-06T12:00:00Z'),
			metodo: 'EFECTIVO',
			idempotencyKey: randomUUID()
		}
	});
	await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: 'PAGADA' } });
	const final = await prisma.cotizacion.findUnique({ where: { id: cot.id } });
	if (final.estado !== 'PAGADA') throw new Error('Debió quedar PAGADA');
	console.log('Pago total → PAGADA OK');

	const hash = createHash('sha256').update('token-demo').digest('hex');
	await prisma.tokenPublico.create({
		data: {
			cotizacionId: cot.id,
			tokenHash: hash,
			expiraEn: new Date(Date.now() + 86400000)
		}
	});
	console.log('Token público OK');
	console.log('SMOKE OK');
}

main()
	.catch((e) => {
		console.error('SMOKE FAIL', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
