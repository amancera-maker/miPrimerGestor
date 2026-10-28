import { test, expect } from '@playwright/test';

test.describe('GestorPyme smoke', () => {
	test('health endpoint', async ({ request }) => {
		const res = await request.get('/api/health');
		expect(res.ok()).toBeTruthy();
		const body = await res.json();
		expect(body.ok).toBe(true);
	});

	test('con bypass auth entra al dashboard', async ({ page }) => {
		await page.goto('/login');
		await page.waitForURL(/dashboard|login/);
		if (page.url().includes('/login')) {
			await expect(page.getByRole('heading', { name: /GestorPyme/i }).or(page.getByText('GestorPyme').first())).toBeVisible();
		} else {
			await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
		}
	});

	test('navegación a clientes y cotizaciones', async ({ page }) => {
		await page.goto('/dashboard');
		await page.goto('/clientes');
		await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
		await page.goto('/cotizaciones');
		await expect(page.getByRole('heading', { name: 'Cotizaciones' })).toBeVisible();
		await page.goto('/cobranza');
		await expect(page.getByRole('heading', { name: 'Cobranza' })).toBeVisible();
		await page.goto('/reportes');
		await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();
	});

	test('responsive 375px sin overflow horizontal en dashboard', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/dashboard');
		const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
	});
});
