#!/usr/bin/env node
/**
 * Preflight de variables para producción.
 * No imprime valores — solo nombres y estado.
 *
 * Uso: node scripts/check-env.mjs [--production]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requireProd = process.argv.includes('--production');

function loadDotEnv() {
	const p = resolve(process.cwd(), '.env');
	if (!existsSync(p)) return;
	const text = readFileSync(p, 'utf8');
	for (const line of text.split(/\r?\n/)) {
		const t = line.trim();
		if (!t || t.startsWith('#')) continue;
		const i = t.indexOf('=');
		if (i < 0) continue;
		const k = t.slice(0, i).trim();
		let v = t.slice(i + 1).trim();
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		if (!(k in process.env)) process.env[k] = v;
	}
}

loadDotEnv();

const required = [
	'DATABASE_URL',
	'PUBLIC_CLERK_PUBLISHABLE_KEY',
	'CLERK_SECRET_KEY',
	'PUBLIC_ORIGIN',
	'AUTHORIZED_EMAILS'
];
const recommended = ['ORIGIN', 'RESEND_API_KEY', 'FROM_EMAIL', 'NODE_ENV'];

/** @type {string[]} */
const missing = [];
/** @type {string[]} */
const warnings = [];

for (const k of required) {
	if (!process.env[k]?.trim()) missing.push(k);
}
for (const k of recommended) {
	if (!process.env[k]?.trim()) warnings.push(`${k} (recomendado)`);
}

if (process.env.DEV_BYPASS_AUTH === 'true') {
	if (requireProd || process.env.NODE_ENV === 'production') {
		missing.push('DEV_BYPASS_AUTH must be unset/false in production');
	} else {
		warnings.push('DEV_BYPASS_AUTH=true (solo local)');
	}
}

if (process.env.DATABASE_URL && !/[?&]sslmode=/i.test(process.env.DATABASE_URL)) {
	warnings.push('DATABASE_URL sin sslmode=require');
}

const livePk = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_');
const testPk = process.env.PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_');
if (requireProd && testPk) {
	warnings.push('Clerk publishable key parece de test (pk_test_)');
}
if (livePk) {
	console.log('Clerk: clave publishable de producción detectada (pk_live_)');
}

console.log('== check-env ==');
if (missing.length) {
	console.error('FALTAN:', missing.join(', '));
} else {
	console.log('Requeridas: OK');
}
if (warnings.length) {
	console.warn('Avisos:', warnings.join('; '));
}

process.exit(missing.length ? 1 : 0);
