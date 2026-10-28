/**
 * @param {string | number | Date | null | undefined} value
 */
export function formatFecha(value) {
	if (!value) return '—';
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat('es-MX', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(d);
}

/**
 * @param {string | number | Date | null | undefined} value
 */
export function formatFechaHora(value) {
	if (!value) return '—';
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return new Intl.DateTimeFormat('es-MX', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}

/**
 * @param {string | number} value
 */
export function formatMXN(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return '$0.00';
	return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

/** @type {Record<string, string>} */
export const ESTADO_LABEL = {
	BORRADOR: 'Borrador',
	ENVIADA: 'Enviada',
	APROBADA: 'Aprobada',
	RECHAZADA: 'Rechazada',
	FACTURADA: 'Facturada',
	PAGADA: 'Pagada'
};

/** @type {Record<string, string>} */
export const ESTADO_BADGE = {
	BORRADOR: 'badge-borrador',
	ENVIADA: 'badge-enviada',
	APROBADA: 'badge-aprobada',
	RECHAZADA: 'badge-rechazada',
	FACTURADA: 'badge-facturada',
	PAGADA: 'badge-pagada'
};

/**
 * @param {Date | string} date
 * @returns {string} YYYY-MM-DD
 */
export function toInputDate(date) {
	const d = date instanceof Date ? date : new Date(date);
	return d.toISOString().slice(0, 10);
}
