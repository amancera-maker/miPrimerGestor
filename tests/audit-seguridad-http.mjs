/**
 * Verifica redirecciones HTTP sin sesión (sin DEV_BYPASS_AUTH).
 * Usa el servidor adapter-node en puerto 4191.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4191;
const base = `http://127.0.0.1:${PORT}`;

const child = spawn(process.execPath, ['build'], {
	cwd: process.cwd(),
	env: {
		...process.env,
		PORT: String(PORT),
		HOST: '127.0.0.1',
		DEV_BYPASS_AUTH: 'false',
		PUBLIC_CLERK_PUBLISHABLE_KEY: '',
		CLERK_SECRET_KEY: '',
		DATABASE_URL:
			process.env.DATABASE_URL ||
			'postgresql://postgres:postgres@127.0.0.1:5432/gestorpyme_test?schema=public'
	},
	stdio: ['ignore', 'pipe', 'pipe']
});

let ready = false;
const onData = (d) => {
	const s = String(d);
	if (s.includes('Listening') || s.includes(String(PORT)) || s.includes('http')) ready = true;
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);

const routes = ['/dashboard', '/clientes', '/cotizaciones', '/cobranza'];
/** @type {{ route: string, status: number, location: string | null, ok: boolean }[]} */
const results = [];

try {
	for (let i = 0; i < 60 && !ready; i++) await sleep(250);
	// Intento aunque no haya log claro
	await sleep(1000);

	for (const route of routes) {
		try {
			const res = await fetch(`${base}${route}`, { redirect: 'manual' });
			const location = res.headers.get('location');
			const ok =
				(res.status >= 300 && res.status < 400 && (location || '').includes('login')) ||
				(res.status === 200 && (await res.text()).includes('Iniciar sesión'));
			results.push({ route, status: res.status, location, ok });
		} catch (e) {
			results.push({
				route,
				status: 0,
				location: null,
				ok: false,
				error: e instanceof Error ? e.message : String(e)
			});
		}
	}

	const allOk = results.every((r) => r.ok);
	console.log(JSON.stringify({ allOk, results }, null, 2));
	process.exit(allOk ? 0 : 1);
} finally {
	child.kill('SIGTERM');
}
