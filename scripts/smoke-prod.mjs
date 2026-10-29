#!/usr/bin/env node
/**
 * Humo HTTP contra una URL pública (post-deploy).
 * No autentica Clerk (login es humano); valida health + redirects.
 *
 * Uso: node scripts/smoke-prod.mjs https://tu-servicio.onrender.com
 */
const base = (process.argv[2] || process.env.PUBLIC_ORIGIN || '').replace(/\/$/, '');
if (!base || !/^https?:\/\//i.test(base)) {
	console.error('Uso: node scripts/smoke-prod.mjs https://tu-app.onrender.com');
	process.exit(1);
}

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = [];

async function check(name, fn) {
	try {
		const detail = await fn();
		results.push({ name, ok: true, detail: String(detail) });
	} catch (e) {
		results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
	}
}

await check('health', async () => {
	const res = await fetch(`${base}/api/health`);
	const body = await res.json();
	if (!res.ok || !body.ok) throw new Error(`status=${res.status} body=${JSON.stringify(body)}`);
	return `db=${body.db}`;
});

for (const path of ['/dashboard', '/clientes', '/cotizaciones', '/cobranza']) {
	await check(`protect ${path}`, async () => {
		const res = await fetch(`${base}${path}`, { redirect: 'manual' });
		if (![301, 302, 303, 307, 308].includes(res.status)) {
			throw new Error(`esperado redirect, got ${res.status}`);
		}
		const loc = res.headers.get('location') || '';
		if (!loc.includes('/login')) throw new Error(`location=${loc}`);
		return loc;
	});
}

await check('login page', async () => {
	const res = await fetch(`${base}/login`);
	if (!res.ok) throw new Error(`status=${res.status}`);
	const html = await res.text();
	if (!/login|iniciar|clerk|google/i.test(html)) {
		throw new Error('HTML de login no reconocido');
	}
	return `bytes=${html.length}`;
});

console.log(`== smoke-prod ${base} ==`);
let failed = 0;
for (const r of results) {
	console.log(`${r.ok ? 'OK' : 'FAIL'}  ${r.name} — ${r.detail}`);
	if (!r.ok) failed++;
}
process.exit(failed ? 1 : 0);
