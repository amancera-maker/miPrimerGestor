import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const WIDTHS = [320, 360, 375, 390, 768, 1024, 1440];
const ROUTES = [
	{ path: '/dashboard', name: 'dashboard' },
	{ path: '/clientes', name: 'clientes' },
	{ path: '/cotizaciones', name: 'cotizaciones' },
	{ path: '/cotizaciones/nueva', name: 'cotizacion-nueva' },
	{ path: '/cobranza', name: 'cobranza' },
	{ path: '/reportes', name: 'reportes' }
];

const shotDir = path.resolve('test-results/responsive');

test.beforeAll(() => {
	fs.mkdirSync(shotDir, { recursive: true });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function assertNoGlobalHorizontalScroll(page) {
	const { scrollWidth, clientWidth } = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth
	}));
	expect(scrollWidth, `scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`).toBeLessThanOrEqual(
		clientWidth + 1
	);
}

/**
 * Solo marca botones/enlaces cortados horizontalmente (no los que están abajo del fold).
 * @param {import('@playwright/test').Page} page
 */
async function assertNoHorizontallyClippedActions(page) {
	const clipped = await page.evaluate(() => {
		const candidates = Array.from(
			document.querySelectorAll('button.btn-primary, button.btn-secondary, a.btn-primary, a.btn-secondary')
		);
		const vw = window.innerWidth;
		/** @type {string[]} */
		const bad = [];
		for (const el of candidates) {
			const r = el.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			if (r.right < 8 || r.left > vw - 8) {
				bad.push((el.textContent || '').trim().slice(0, 40));
			}
		}
		return bad;
	});
	expect(clipped, `Elementos cortados horizontalmente: ${clipped.join(', ')}`).toEqual([]);
}

for (const width of WIDTHS) {
	test.describe(`AUD-P8 responsive ${width}px`, () => {
		test.use({ viewport: { width, height: width < 768 ? 800 : 900 } });

		for (const route of ROUTES) {
			test(`${route.name}`, async ({ page }) => {
				await page.goto(route.path);
				await expect(page.locator('main')).toBeVisible();
				await assertNoGlobalHorizontalScroll(page);
				await assertNoHorizontallyClippedActions(page);
				await page.screenshot({
					path: path.join(shotDir, `${width}-${route.name}.png`),
					fullPage: true
				});
			});
		}

		test('modal registrar cliente no se sale', async ({ page }) => {
			await page.goto('/clientes');
			await page.getByRole('button', { name: 'Registrar cliente' }).click();
			const dialog = page.getByRole('dialog');
			await expect(dialog).toBeVisible();
			const box = await dialog.boundingBox();
			expect(box).toBeTruthy();
			if (box) {
				expect(box.x).toBeGreaterThanOrEqual(-2);
				expect(box.y).toBeGreaterThanOrEqual(-2);
				expect(box.x + box.width).toBeLessThanOrEqual(width + 4);
			}
			await assertNoGlobalHorizontalScroll(page);
			await page.screenshot({
				path: path.join(shotDir, `${width}-modal-cliente.png`),
				fullPage: true
			});
		});
	});
}
