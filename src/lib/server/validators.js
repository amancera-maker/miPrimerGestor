import { z } from 'zod';
import { normalizeNombre, normalizeRfc, normalizeTelefono } from './normalize.js';
import { money } from './money.js';

const rfcRegex = /^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/;

export const clienteSchema = z.object({
	nombre: z
		.string({ required_error: 'El nombre es obligatorio' })
		.trim()
		.min(2, 'El nombre es obligatorio')
		.max(200, 'El nombre es demasiado largo'),
	empresa: z.string().trim().max(200).optional().nullable().or(z.literal('')),
	rfc: z
		.string()
		.trim()
		.optional()
		.nullable()
		.or(z.literal(''))
		.refine((v) => !v || rfcRegex.test(normalizeRfc(v) ?? ''), {
			message: 'RFC mexicano inválido (12 o 13 caracteres alfanuméricos)'
		}),
	correo: z
		.string({ required_error: 'El correo es obligatorio' })
		.trim()
		.email('Correo electrónico inválido')
		.max(200),
	telefono: z.string().optional().nullable().or(z.literal('')),
	direccion: z.string().trim().max(500).optional().nullable().or(z.literal('')),
	notas: z.string().trim().max(2000).optional().nullable().or(z.literal(''))
});

/**
 * @param {unknown} input
 */
export function parseCliente(input) {
	const parsed = clienteSchema.safeParse(input);
	if (!parsed.success) {
		/** @type {Record<string, string>} */
		const fieldErrors = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] ? String(issue.path[0]) : '_form';
			if (!fieldErrors[key]) fieldErrors[key] = issue.message;
		}
		return { ok: false, fieldErrors };
	}
	const data = parsed.data;
	const tel = normalizeTelefono(data.telefono);
	if (!tel.ok) {
		return { ok: false, fieldErrors: { telefono: tel.error } };
	}
	const nombre = data.nombre.trim().replace(/\s+/g, ' ');
	const nombreNormalizado = normalizeNombre(nombre);
	if (!nombreNormalizado) {
		return { ok: false, fieldErrors: { nombre: 'El nombre es obligatorio' } };
	}
	return {
		ok: true,
		data: {
			nombre,
			nombreNormalizado,
			empresa: data.empresa?.trim() || null,
			rfc: normalizeRfc(data.rfc),
			correo: data.correo.trim().toLowerCase(),
			telefono: tel.display,
			telefonoNormalizado: tel.normalizado,
			direccion: data.direccion?.trim() || null,
			notas: data.notas?.trim() || null
		}
	};
}

const conceptoSchema = z.object({
	descripcion: z
		.string({ required_error: 'La descripción del concepto es obligatoria' })
		.trim()
		.min(1, 'La descripción del concepto es obligatoria'),
	cantidad: z.preprocess((v) => {
		if (v === '' || v == null) return v;
		const n = Number(v);
		return Number.isFinite(n) ? n : v;
	}, z.number({ invalid_type_error: 'La cantidad debe ser un número entero' })
		.int('La cantidad debe ser un entero (sin decimales)')
		.positive('La cantidad debe ser mayor que cero')),
	precioUnitario: z.string().or(z.number())
});

/**
 * @param {unknown} input
 */
export function parseCotizacionInput(input) {
	const base = z
		.object({
			clienteId: z.string().min(1, 'Selecciona un cliente'),
			fecha: z.string().min(1, 'La fecha de emisión es obligatoria'),
			vencimiento: z.string().min(1, 'La fecha de vencimiento es obligatoria'),
			notas: z.string().optional().nullable().or(z.literal('')),
			conceptos: z.array(conceptoSchema).min(1, 'Agrega al menos un concepto')
		})
		.safeParse(input);

	/** @type {Record<string, string>} */
	const fieldErrors = {};
	if (!base.success) {
		for (const issue of base.error.issues) {
			const key = issue.path.join('.') || '_form';
			if (!fieldErrors[key]) fieldErrors[key] = issue.message;
		}
		if (!fieldErrors._form) {
			const first = Object.values(fieldErrors)[0];
			if (first) fieldErrors._form = first;
		}
		return { ok: false, fieldErrors };
	}

	const { fecha, vencimiento, conceptos } = base.data;
	const fechaEmision = parseDateOnly(fecha);
	const fechaVenc = parseDateOnly(vencimiento);
	if (!fechaEmision) fieldErrors.fecha = 'Fecha de emisión inválida';
	if (!fechaVenc) fieldErrors.vencimiento = 'Fecha de vencimiento inválida';
	if (fechaEmision && fechaVenc && fechaVenc < fechaEmision) {
		fieldErrors.vencimiento = 'El vencimiento no puede ser anterior a la emisión';
	}

	conceptos.forEach((c, i) => {
		if (!String(c.descripcion ?? '').trim()) {
			fieldErrors[`conceptos.${i}.descripcion`] = 'La descripción del concepto es obligatoria';
		}
		if (!Number.isInteger(c.cantidad) || c.cantidad < 1) {
			fieldErrors[`conceptos.${i}.cantidad`] = 'La cantidad debe ser un entero positivo (sin decimales)';
		}
		try {
			const p = money(c.precioUnitario);
			if (p.lte(0)) fieldErrors[`conceptos.${i}.precioUnitario`] = 'El precio debe ser mayor que cero';
			if (p.decimalPlaces() > 2) {
				fieldErrors[`conceptos.${i}.precioUnitario`] = 'Máximo dos decimales';
			}
		} catch {
			fieldErrors[`conceptos.${i}.precioUnitario`] = 'Precio unitario inválido';
		}
	});

	if (Object.keys(fieldErrors).length) {
		if (!fieldErrors._form) {
			fieldErrors._form =
				fieldErrors.fecha ||
				fieldErrors.vencimiento ||
				fieldErrors.clienteId ||
				Object.entries(fieldErrors).find(([k]) => k.startsWith('conceptos.'))?.[1] ||
				'Revisa los datos del formulario';
		}
		return { ok: false, fieldErrors };
	}

	return {
		ok: true,
		data: {
			clienteId: base.data.clienteId,
			fecha: /** @type {Date} */ (fechaEmision),
			vencimiento: /** @type {Date} */ (fechaVenc),
			notas: base.data.notas?.trim() || null,
			conceptos: conceptos.map((c) => ({
				descripcion: c.descripcion.trim(),
				cantidad: c.cantidad,
				precioUnitario: String(c.precioUnitario)
			}))
		}
	};
}

/**
 * @param {string} value YYYY-MM-DD
 * @returns {Date | null}
 */
export function parseDateOnly(value) {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
	if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
	return dt;
}

/**
 * @param {unknown} input
 */
export function parsePagoInput(input) {
	const schema = z.object({
		monto: z.string().or(z.number()),
		fecha: z.string().min(1, 'La fecha de pago es obligatoria'),
		metodo: z.enum(['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA'], {
			required_error: 'Selecciona un método de pago'
		}),
		referencia: z.string().optional().nullable().or(z.literal('')),
		idempotencyKey: z.string().optional().nullable()
	});
	const parsed = schema.safeParse(input);
	/** @type {Record<string, string>} */
	const fieldErrors = {};
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			const key = String(issue.path[0] ?? '_form');
			if (!fieldErrors[key]) fieldErrors[key] = issue.message;
		}
		return { ok: false, fieldErrors };
	}
	let monto;
	try {
		monto = money(parsed.data.monto);
	} catch {
		return { ok: false, fieldErrors: { monto: 'Monto inválido' } };
	}
	if (monto.lte(0)) return { ok: false, fieldErrors: { monto: 'El monto debe ser mayor que cero' } };
	if (monto.decimalPlaces() > 2) {
		return { ok: false, fieldErrors: { monto: 'El monto admite máximo dos decimales' } };
	}
	const fecha = parseDateOnly(parsed.data.fecha);
	if (!fecha) return { ok: false, fieldErrors: { fecha: 'Fecha de pago inválida' } };
	return {
		ok: true,
		data: {
			monto: monto.toFixed(2),
			fecha,
			metodo: parsed.data.metodo,
			referencia: parsed.data.referencia?.trim() || null,
			idempotencyKey: parsed.data.idempotencyKey || null
		}
	};
}
