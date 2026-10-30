/**
 * Seed demo — variedad de clientes, cotizaciones, pagos e historial
 * para mostrar Dashboard, Clientes, Cotizaciones y Cobranza.
 *
 * Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();
const IVA = new Decimal('0.16');

/**
 * @param {string} value
 */
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

/**
 * @param {number} y
 * @param {number} m 0-11
 * @param {number} d
 */
function dUTC(y, m, d) {
	return new Date(Date.UTC(y, m, d, 12, 0, 0));
}

/**
 * @param {{ descripcion: string, cantidad: number, precio: string }[]} lineas
 */
function totalesDe(lineas) {
	let sub = new Decimal(0);
	const conceptos = lineas.map((l, i) => {
		const pu = new Decimal(l.precio);
		const st = pu.mul(l.cantidad).toDecimalPlaces(2);
		sub = sub.plus(st);
		return {
			descripcion: l.descripcion,
			cantidad: l.cantidad,
			precioUnitario: pu.toFixed(2),
			subtotal: st.toFixed(2),
			orden: i
		};
	});
	sub = sub.toDecimalPlaces(2);
	const iva = sub.mul(IVA).toDecimalPlaces(2);
	const total = sub.plus(iva).toDecimalPlaces(2);
	return {
		conceptos,
		subtotal: sub.toFixed(2),
		iva: iva.toFixed(2),
		total: total.toFixed(2)
	};
}

async function main() {
	console.log('Limpiando datos de negocio…');
	await prisma.idempotencyKey.deleteMany();
	await prisma.tokenPublico.deleteMany();
	await prisma.notificacion.deleteMany();
	await prisma.historialCot.deleteMany();
	await prisma.pago.deleteMany();
	await prisma.concepto.deleteMany();
	await prisma.cotizacion.deleteMany();
	await prisma.cliente.deleteMany();
	await prisma.contadorCotizacion.deleteMany();

	await prisma.configDespacho.upsert({
		where: { id: 'default' },
		create: {
			id: 'default',
			nombre: 'Despacho Mancera & Asociados',
			rfc: 'DMA850101AB1',
			direccion: 'Av. Universidad 1200, Chihuahua, Chih.',
			telefono: '+52 614 410 2200',
			correo: 'contacto@despachomancera.mx',
			datosTransferencia: 'BBVA · CLABE 012150001234567890 · A nombre de Despacho Mancera SC'
		},
		update: {
			nombre: 'Despacho Mancera & Asociados',
			rfc: 'DMA850101AB1',
			direccion: 'Av. Universidad 1200, Chihuahua, Chih.',
			telefono: '+52 614 410 2200',
			correo: 'contacto@despachomancera.mx',
			datosTransferencia: 'BBVA · CLABE 012150001234567890 · A nombre de Despacho Mancera SC'
		}
	});

	const year = new Date().getUTCFullYear();
	const now = new Date();
	const mes = now.getUTCMonth();

	/** @type {const} */
	const clientesData = [
		{
			nombre: 'Ana López García',
			empresa: 'Comercial López SA de CV',
			rfc: 'LOGA850215AB1',
			correo: 'ana.lopez@comercialopez.mx',
			telefono: '+52 614 111 2233',
			direccion: 'Calle Juárez 45, Chihuahua',
			notas: 'Cliente preferente — pago por transferencia',
			activo: true
		},
		{
			nombre: 'Carlos Rivera Méndez',
			empresa: 'Constructora del Norte',
			rfc: 'RIMC780903XY2',
			correo: 'crivera@constructoranorte.mx',
			telefono: '+52 614 222 3344',
			direccion: 'Blvd. Ortiz Mena 800',
			notas: null,
			activo: true
		},
		{
			nombre: 'María Elena Soto',
			empresa: 'Clínica Santa Fe',
			rfc: 'SOEM900101ZZ9',
			correo: 'msoto@clinicasantafe.mx',
			telefono: '+52 614 333 4455',
			direccion: 'Av. Tecnológico 210',
			notas: 'Factura a nombre de la clínica',
			activo: true
		},
		{
			nombre: 'José Alberto Ruiz',
			empresa: 'Agropecuaria Ruiz',
			rfc: 'RUAJ750512HH3',
			correo: 'jruiz@agroruiz.mx',
			telefono: '+52 625 444 5566',
			direccion: 'Carretera a Aldama km 12',
			notas: null,
			activo: true
		},
		{
			nombre: 'Patricia Hernández',
			empresa: null,
			rfc: 'HEPA880707KK4',
			correo: 'patricia.hernandez@email.com',
			telefono: '+52 614 555 6677',
			direccion: 'Col. San Felipe, Chihuahua',
			notas: 'Persona física — honorarios',
			activo: true
		},
		{
			nombre: 'Roberto Ibarra',
			empresa: 'Transportes Ibarra',
			rfc: 'IARO820320MM5',
			correo: 'ribarra@tibarra.mx',
			telefono: '+52 614 666 7788',
			direccion: 'Parque Industrial Sur',
			notas: null,
			activo: true
		},
		{
			nombre: 'Laura Méndez Castro',
			empresa: 'Boutique Lumière',
			rfc: 'MECL920415NN6',
			correo: 'laura@lumiere.mx',
			telefono: '+52 614 777 8899',
			direccion: 'Plaza Victoria Local 12',
			notas: null,
			activo: true
		},
		{
			nombre: 'Fernando Vargas',
			empresa: 'Taller Vargas Automotriz',
			rfc: 'VAFE700101PP7',
			correo: 'fvargas@tallervargas.mx',
			telefono: '+52 614 888 9900',
			direccion: 'Calle 20a y Mirador',
			notas: 'Cobranza a 15 días',
			activo: true
		},
		{
			nombre: 'Sofía Navarro',
			empresa: 'Estudio Navarro Arquitectura',
			rfc: 'NASO850909QQ8',
			correo: 'sofia@navarroarq.mx',
			telefono: '+52 614 999 0011',
			direccion: 'Col. Residencial Campestre',
			notas: null,
			activo: true
		},
		{
			nombre: 'Diego Ponce',
			empresa: 'Ponce Contadores SC',
			rfc: 'PODI830202RR9',
			correo: 'dponce@poncecontadores.mx',
			telefono: '+52 614 101 1213',
			direccion: 'Torre Ejecutiva Piso 8',
			notas: 'Referido por Ana López',
			activo: true
		},
		{
			nombre: 'Cliente Inactivo Demo',
			empresa: 'Empresa Cerrada SA',
			rfc: 'EICA010101SS0',
			correo: 'inactivo@ejemplo.mx',
			telefono: '+52 614 000 1111',
			direccion: null,
			notas: 'Desactivado para demo',
			activo: false
		},
		{
			nombre: 'Gabriela Torres',
			empresa: 'Panadería Torres',
			rfc: 'TOGA910303TT1',
			correo: 'gabi@panatoriatorres.mx',
			telefono: '+52 614 121 3141',
			direccion: 'Mercado Reforma Local 3',
			notas: null,
			activo: true
		}
	];

	console.log('Creando clientes…');
	/** @type {Record<string, string>} */
	const clienteIds = {};
	for (const c of clientesData) {
		const nn = normalizeNombre(c.nombre);
		const created = await prisma.cliente.create({
			data: {
				nombre: c.nombre,
				nombreNormalizado: nn,
				nombreClaveActiva: c.activo ? nn : null,
				empresa: c.empresa,
				rfc: c.rfc,
				correo: c.correo,
				telefono: c.telefono,
				telefonoNormalizado: c.telefono?.replace(/\s/g, '') ?? null,
				direccion: c.direccion,
				notas: c.notas,
				activo: c.activo
			}
		});
		clienteIds[c.nombre] = created.id;
	}

	/**
	 * @param {object} opts
	 */
	async function crearCot({
		numero,
		clienteNombre,
		estado,
		fecha,
		vencimiento,
		lineas,
		notas = null,
		facturadaEn = null,
		historial = [],
		pagos = [],
		creadoEn = null
	}) {
		const t = totalesDe(lineas);
		const clienteId = clienteIds[clienteNombre];
		const cot = await prisma.cotizacion.create({
			data: {
				numero,
				clienteId,
				estado,
				fecha,
				vencimiento,
				subtotal: t.subtotal,
				iva: t.iva,
				total: t.total,
				notas,
				facturadaEn,
				creadoPorNombre: 'Demo Seed',
				creadoEn: creadoEn ?? fecha,
				conceptos: { create: t.conceptos },
				historial: {
					create: [
						{
							estadoAnterior: null,
							estadoNuevo: 'BORRADOR',
							nota: 'Cotización creada (seed)',
							usuarioNombre: 'Demo Seed',
							creadoEn: fecha
						},
						...historial.map((h) => ({
							...h,
							usuarioNombre: h.usuarioNombre ?? 'Demo Seed'
						}))
					]
				},
				pagos: {
					create: pagos.map((p) => ({
						monto: p.monto,
						fecha: p.fecha,
						metodo: p.metodo,
						referencia: p.referencia ?? null,
						creadoPorNombre: 'Demo Seed'
					}))
				}
			}
		});
		return cot;
	}

	console.log('Creando cotizaciones y pagos…');
	let n = 1;
	const num = () => `COT-${year}-${String(n++).padStart(3, '0')}`;

	// --- BORRADOR ---
	await crearCot({
		numero: num(),
		clienteNombre: 'Patricia Hernández',
		estado: 'BORRADOR',
		fecha: dUTC(year, mes, 2),
		vencimiento: dUTC(year, mes, 17),
		lineas: [
			{ descripcion: 'Asesoría fiscal mensual', cantidad: 1, precio: '4500.00' },
			{ descripcion: 'Revisión de CFDI', cantidad: 2, precio: '800.00' }
		],
		notas: 'Borrador pendiente de revisar con la clienta'
	});

	await crearCot({
		numero: num(),
		clienteNombre: 'Gabriela Torres',
		estado: 'BORRADOR',
		fecha: dUTC(year, mes, 5),
		vencimiento: dUTC(year, mes, 20),
		lineas: [{ descripcion: 'Alta de marca ante IMPI', cantidad: 1, precio: '6200.00' }]
	});

	// --- ENVIADA ---
	await crearCot({
		numero: num(),
		clienteNombre: 'Laura Méndez Castro',
		estado: 'ENVIADA',
		fecha: dUTC(year, mes, 1),
		vencimiento: dUTC(year, mes, 16),
		lineas: [
			{ descripcion: 'Constitución de SA de CV', cantidad: 1, precio: '12000.00' },
			{ descripcion: 'Libros corporativos', cantidad: 1, precio: '2500.00' }
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Correo enviado a laura@lumiere.mx',
				creadoEn: dUTC(year, mes, 1)
			}
		]
	});

	await crearCot({
		numero: num(),
		clienteNombre: 'Diego Ponce',
		estado: 'ENVIADA',
		fecha: dUTC(year, mes, 8),
		vencimiento: dUTC(year, mes, 23),
		lineas: [
			{ descripcion: 'Dictamen de estados financieros', cantidad: 1, precio: '18000.00' },
			{ descripcion: 'Horas de consultoría', cantidad: 8, precio: '950.00' }
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Correo enviado',
				creadoEn: dUTC(year, mes, 8)
			}
		]
	});

	// --- APROBADA (cobranza — sin pagos / parcial) ---
	await crearCot({
		numero: num(),
		clienteNombre: 'Ana López García',
		estado: 'APROBADA',
		fecha: dUTC(year, mes, 3),
		vencimiento: dUTC(year, mes, 18),
		lineas: [
			{ descripcion: 'Declaración anual personas morales', cantidad: 1, precio: '9500.00' },
			{ descripcion: 'Complementarias IVA', cantidad: 3, precio: '1200.00' }
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes, 3)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Cliente aprobó por correo',
				creadoEn: dUTC(year, mes, 4)
			}
		]
	});

	await crearCot({
		numero: num(),
		clienteNombre: 'Carlos Rivera Méndez',
		estado: 'APROBADA',
		fecha: dUTC(year, mes > 0 ? mes - 1 : 0, 10),
		vencimiento: dUTC(year, mes > 0 ? mes - 1 : 0, 25),
		creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 10),
		lineas: [
			{ descripcion: 'Contrato de obra pública', cantidad: 1, precio: '15000.00' },
			{ descripcion: 'Gestión de permisos municipales', cantidad: 2, precio: '3500.00' }
		],
		pagos: [
			{
				monto: '8000.00',
				fecha: dUTC(year, mes > 0 ? mes - 1 : 0, 20),
				metodo: 'TRANSFERENCIA',
				referencia: 'SPEI-77821'
			}
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 10)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Aprobada',
				creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 12)
			},
			{
				estadoAnterior: 'APROBADA',
				estadoNuevo: 'APROBADA',
				nota: 'Pago registrado: 8000.00 (TRANSFERENCIA)',
				creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 20)
			}
		]
	});

	await crearCot({
		numero: num(),
		clienteNombre: 'Roberto Ibarra',
		estado: 'APROBADA',
		fecha: dUTC(year, mes, 6),
		vencimiento: dUTC(year, mes, 21),
		lineas: [
			{ descripcion: 'Defensa laboral 3 expedientes', cantidad: 3, precio: '4200.00' },
			{ descripcion: 'Audiencias conciliatorias', cantidad: 2, precio: '1800.00' }
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes, 6)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Aprobada',
				creadoEn: dUTC(year, mes, 7)
			}
		]
	});

	// --- RECHAZADA ---
	await crearCot({
		numero: num(),
		clienteNombre: 'Fernando Vargas',
		estado: 'RECHAZADA',
		fecha: dUTC(year, mes > 0 ? mes - 1 : 0, 5),
		vencimiento: dUTC(year, mes > 0 ? mes - 1 : 0, 20),
		creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 5),
		lineas: [{ descripcion: 'Auditoría interna de nómina', cantidad: 1, precio: '22000.00' }],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 5)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'RECHAZADA',
				nota: 'Cliente eligió otro despacho',
				creadoEn: dUTC(year, mes > 0 ? mes - 1 : 0, 15)
			}
		]
	});

	// --- APROBADA con pago parcial (cobranza; aún no se puede facturar) ---
	await crearCot({
		numero: num(),
		clienteNombre: 'María Elena Soto',
		estado: 'APROBADA',
		fecha: dUTC(year, mes, 4),
		vencimiento: dUTC(year, mes, 19),
		lineas: [
			{ descripcion: 'Aviso de privacidad y políticas', cantidad: 1, precio: '7800.00' },
			{ descripcion: 'Capacitación personal (4 hrs)', cantidad: 4, precio: '1100.00' }
		],
		pagos: [
			{
				monto: '5000.00',
				fecha: dUTC(year, mes, 10),
				metodo: 'TRANSFERENCIA',
				referencia: 'FAC-901'
			}
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes, 4)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Aprobada',
				creadoEn: dUTC(year, mes, 5)
			},
			{
				estadoAnterior: 'APROBADA',
				estadoNuevo: 'APROBADA',
				nota: 'Pago registrado: 5000.00',
				creadoEn: dUTC(year, mes, 10)
			}
		]
	});

	await crearCot({
		numero: num(),
		clienteNombre: 'José Alberto Ruiz',
		estado: 'APROBADA',
		fecha: dUTC(year, mes, 7),
		vencimiento: dUTC(year, mes, 22),
		lineas: [
			{ descripcion: 'Trámite de subsidios SADER', cantidad: 1, precio: '6500.00' },
			{ descripcion: 'Gestión de permisos sanitarios', cantidad: 1, precio: '3200.00' }
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes, 7)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Aprobada',
				creadoEn: dUTC(year, mes, 8)
			}
		]
	});

	// --- FACTURADA (cobro total primero, luego factura) — meses anteriores ---
	for (let back = 1; back <= 5; back++) {
		const m = mes - back;
		const y = m >= 0 ? year : year - 1;
		const mm = m >= 0 ? m : m + 12;
		const clienteNombres = [
			'Ana López García',
			'Carlos Rivera Méndez',
			'Sofía Navarro',
			'Diego Ponce',
			'Patricia Hernández'
		];
		const cn = clienteNombres[(back - 1) % clienteNombres.length];
		const totLineas = [
			{ descripcion: `Servicio mensual contable (${mm + 1}/${y})`, cantidad: 1, precio: String(5000 + back * 750) },
			{ descripcion: 'Soporte remoto', cantidad: back + 1, precio: '600.00' }
		];
		const t = totalesDe(totLineas);
		await crearCot({
			numero: num(),
			clienteNombre: cn,
			estado: 'FACTURADA',
			fecha: dUTC(y, mm, 5),
			vencimiento: dUTC(y, mm, 20),
			creadoEn: dUTC(y, mm, 5),
			facturadaEn: dUTC(y, mm, 20),
			lineas: totLineas,
			pagos: [
				{
					monto: t.total,
					fecha: dUTC(y, mm, 18),
					metodo: back % 2 === 0 ? 'TRANSFERENCIA' : 'TARJETA',
					referencia: `PAG-${y}${String(mm + 1).padStart(2, '0')}`
				}
			],
			historial: [
				{
					estadoAnterior: 'BORRADOR',
					estadoNuevo: 'ENVIADA',
					nota: 'Enviada',
					creadoEn: dUTC(y, mm, 5)
				},
				{
					estadoAnterior: 'ENVIADA',
					estadoNuevo: 'APROBADA',
					nota: 'Aprobada',
					creadoEn: dUTC(y, mm, 7)
				},
				{
					estadoAnterior: 'APROBADA',
					estadoNuevo: 'PAGADA',
					nota: 'Pago completo — estado automático PAGADA',
					creadoEn: dUTC(y, mm, 18)
				},
				{
					estadoAnterior: 'PAGADA',
					estadoNuevo: 'FACTURADA',
					nota: 'Facturada tras cobro total',
					creadoEn: dUTC(y, mm, 20)
				}
			]
		});
	}

	// PAGADA del mes (cobrada, pendiente de facturar)
	await crearCot({
		numero: num(),
		clienteNombre: 'Sofía Navarro',
		estado: 'PAGADA',
		fecha: dUTC(year, mes, 2),
		vencimiento: dUTC(year, mes, 12),
		lineas: [
			{ descripcion: 'Proyecto ejecutivo vivienda', cantidad: 1, precio: '14000.00' },
			{ descripcion: 'Visitas a obra', cantidad: 4, precio: '1500.00' }
		],
		pagos: [
			{
				monto: '10000.00',
				fecha: dUTC(year, mes, 6),
				metodo: 'TRANSFERENCIA',
				referencia: 'PARCIAL-1'
			},
			{
				monto: '13200.00',
				fecha: dUTC(year, mes, 12),
				metodo: 'TRANSFERENCIA',
				referencia: 'LIQ-12'
			}
		],
		historial: [
			{
				estadoAnterior: 'BORRADOR',
				estadoNuevo: 'ENVIADA',
				nota: 'Enviada',
				creadoEn: dUTC(year, mes, 2)
			},
			{
				estadoAnterior: 'ENVIADA',
				estadoNuevo: 'APROBADA',
				nota: 'Aprobada',
				creadoEn: dUTC(year, mes, 3)
			},
			{
				estadoAnterior: 'APROBADA',
				estadoNuevo: 'PAGADA',
				nota: 'Pago completo — estado automático PAGADA',
				creadoEn: dUTC(year, mes, 12)
			}
		]
	});

	// FACTURADA del mes (cobrada + facturada)
	{
		const lineasFac = [
			{ descripcion: 'Consultoría fiscal extraordinaria', cantidad: 1, precio: '8500.00' },
			{ descripcion: 'Revisión de declaraciones', cantidad: 2, precio: '1500.00' }
		];
		const tFac = totalesDe(lineasFac);
		await crearCot({
			numero: num(),
			clienteNombre: 'Diego Ponce',
			estado: 'FACTURADA',
			fecha: dUTC(year, mes, 3),
			vencimiento: dUTC(year, mes, 18),
			facturadaEn: dUTC(year, mes, 14),
			lineas: lineasFac,
			pagos: [
				{
					monto: tFac.total,
					fecha: dUTC(year, mes, 12),
					metodo: 'TRANSFERENCIA',
					referencia: 'FAC-MES'
				}
			],
			historial: [
				{
					estadoAnterior: 'BORRADOR',
					estadoNuevo: 'ENVIADA',
					nota: 'Enviada',
					creadoEn: dUTC(year, mes, 3)
				},
				{
					estadoAnterior: 'ENVIADA',
					estadoNuevo: 'APROBADA',
					nota: 'Aprobada',
					creadoEn: dUTC(year, mes, 4)
				},
				{
					estadoAnterior: 'APROBADA',
					estadoNuevo: 'PAGADA',
					nota: 'Pago completo — estado automático PAGADA',
					creadoEn: dUTC(year, mes, 12)
				},
				{
					estadoAnterior: 'PAGADA',
					estadoNuevo: 'FACTURADA',
					nota: 'Facturada tras cobro total',
					creadoEn: dUTC(year, mes, 14)
				}
			]
		});
	}

	await prisma.contadorCotizacion.create({
		data: { anio: year, siguiente: n }
	});

	const counts = {
		clientes: await prisma.cliente.count(),
		cotizaciones: await prisma.cotizacion.count(),
		pagos: await prisma.pago.count(),
		conceptos: await prisma.concepto.count()
	};
	console.log('Seed listo:', counts);
	console.log('Estados:', await prisma.cotizacion.groupBy({ by: ['estado'], _count: true }));
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
