import { describe, expect, it, beforeEach } from 'vitest';
import { useIsolatedDb, clienteInput, prisma } from './helpers/db.js';
import { crearCliente } from '../src/lib/server/clientes.js';
import { crearCotizacion, cambiarEstado } from '../src/lib/server/cotizaciones.js';
import { enviarCorreoCotizacion } from '../src/lib/server/email.js';
import {
	setMailer,
	createFailingMailer,
	createAcceptingMailer,
	sentMailLog
} from '../src/lib/server/mailer.js';

useIsolatedDb();

describe('AUD-P6 Correos', () => {
	/** @type {string} */
	let cotId;

	beforeEach(async () => {
		const c = await crearCliente(
			clienteInput({ nombre: 'Cliente Mail', correo: 'cliente.mail@ejemplo.test' })
		);
		setMailer(createAcceptingMailer());
		const cot = await crearCotizacion({
			clienteId: c.cliente.id,
			fecha: '2026-10-01',
			vencimiento: '2026-10-15',
			conceptos: [{ descripcion: 'Servicio', cantidad: 1, precioUnitario: '100' }]
		});
		cotId = cot.cotizacion.id;
	});

	it('AUD-P6-01 fallo controlado: mensaje amigable, FALLIDA, estado ENVIADA, reintento', async () => {
		setMailer(createFailingMailer('proveedor-caido'));
		const r = await cambiarEstado(cotId, 'ENVIADA', { userId: 'u', userName: 'QA' });
		expect(r.ok).toBe(true);
		expect(r.avisoCorreo).toBe('Cotización actualizada. El correo no pudo enviarse.');
		expect(r.avisoCorreo).not.toMatch(/proveedor-caido|TEST_FAIL|stack/i);

		const cot = await prisma.cotizacion.findUnique({
			where: { id: cotId },
			include: { historial: true, notificaciones: true }
		});
		expect(cot.estado).toBe('ENVIADA');
		expect(cot.notificaciones[0].estado).toBe('FALLIDA');
		expect(cot.notificaciones[0].errorTecnico).toBeTruthy();
		const histPublic = cot.historial.map((h) => h.nota).join(' ');
		expect(histPublic).not.toMatch(/TEST_FAIL|proveedor-caido/);

		setMailer(createAcceptingMailer());
		const retry = await enviarCorreoCotizacion(cotId);
		expect(retry.ok).toBe(true);
		const notifs = await prisma.notificacion.findMany({
			where: { cotizacionId: cotId },
			orderBy: { creadoEn: 'asc' }
		});
		expect(notifs.some((n) => n.estado === 'FALLIDA')).toBe(true);
		expect(notifs.some((n) => n.estado === 'ACEPTADA_POR_PROVEEDOR')).toBe(true);
		expect(notifs.filter((n) => n.estado === 'ACEPTADA_POR_PROVEEDOR')).toHaveLength(1);
		expect(sentMailLog.length).toBe(1);
		// Aceptado ≠ entregado
		expect(notifs.find((n) => n.estado === 'ACEPTADA_POR_PROVEEDOR')?.estado).not.toBe('ENTREGADA');
	});
});
