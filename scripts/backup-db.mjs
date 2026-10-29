#!/usr/bin/env node
/**
 * Respaldo lógico de PostgreSQL vía pg_dump.
 * Requiere pg_dump en PATH y DATABASE_URL con permisos de lectura.
 *
 * Uso: npm run db:backup
 * Salida: backups/gestorpyme-YYYYMMDD-HHMMSS.sql
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
	const p = resolve(process.cwd(), '.env');
	if (!existsSync(p)) return;
	for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
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

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL no definida');
	process.exit(1);
}

const dir = resolve(process.cwd(), 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const out = resolve(dir, `gestorpyme-${stamp}.sql`);

const r = spawnSync('pg_dump', ['--no-owner', '--no-acl', '--format=plain', `--file=${out}`, url], {
	encoding: 'utf8',
	shell: false
});

if (r.error || r.status !== 0) {
	console.error('pg_dump falló. Instale PostgreSQL client tools o use el panel de Supabase → Database → Backups.');
	if (r.stderr) console.error(r.stderr);
	if (r.error) console.error(r.error.message);
	process.exit(1);
}

console.log('Respaldo escrito en', out);
console.log('(El archivo backups/ está en .gitignore — no se sube a Git.)');
