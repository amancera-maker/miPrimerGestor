/**
 * Normaliza texto para comparación de identidad (nombres de clientes).
 * NFC + minúsculas + quita acentos + colapsa espacios.
 * @param {string} value
 */
export function normalizeNombre(value) {
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
 * Extrae dígitos y valida teléfono mexicano (10 dígitos, opcional +52).
 * @param {string | null | undefined} value
 * @returns {{ ok: true, normalizado: string, display: string } | { ok: false, error: string } | { ok: true, normalizado: null, display: null }}
 */
export function normalizeTelefono(value) {
	if (value == null || String(value).trim() === '') {
		return { ok: true, normalizado: null, display: null };
	}
	const raw = String(value).trim();
	if (/[^\d\s+\-().]/.test(raw)) {
		return {
			ok: false,
			error: 'El teléfono solo admite dígitos (opcionalmente espacios, +, guiones o paréntesis)'
		};
	}
	const digits = raw.replace(/\D/g, '');
	let national = digits;
	if (digits.length === 12 && digits.startsWith('52')) {
		national = digits.slice(2);
	} else if (digits.length === 13 && digits.startsWith('521')) {
		national = digits.slice(3);
	}
	if (national.length !== 10) {
		return {
			ok: false,
			error: 'Ingresa un teléfono mexicano de 10 dígitos (opcionalmente con +52)'
		};
	}
	if (!/^[1-9]\d{9}$/.test(national)) {
		return { ok: false, error: 'El teléfono mexicano no es válido' };
	}
	const display = `+52 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
	return { ok: true, normalizado: `+52${national}`, display };
}

/**
 * @param {string | null | undefined} rfc
 */
export function normalizeRfc(rfc) {
	if (rfc == null || String(rfc).trim() === '') return null;
	return String(rfc).trim().toUpperCase().replace(/\s+/g, '');
}
