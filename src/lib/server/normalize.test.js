import { describe, expect, it } from 'vitest';
import { normalizeNombre, normalizeTelefono, normalizeRfc } from './normalize.js';

describe('normalizeNombre', () => {
	it('normaliza acentos, mayúsculas y espacios', () => {
		expect(normalizeNombre('  José  Pérez  ')).toBe('jose perez');
		expect(normalizeNombre('JOSÉ PÉREZ')).toBe(normalizeNombre('Jose Perez'));
	});
});

describe('normalizeTelefono', () => {
	it('acepta 10 dígitos y +52', () => {
		expect(normalizeTelefono('6141234567').normalizado).toBe('+526141234567');
		expect(normalizeTelefono('+52 614 123 4567').normalizado).toBe('+526141234567');
	});

	it('rechaza letras', () => {
		expect(normalizeTelefono('hola').ok).toBe(false);
	});
});

describe('normalizeRfc', () => {
	it('uppercases and trims', () => {
		expect(normalizeRfc(' xaXX010101000 ')).toBe('XAXX010101000');
	});
});
