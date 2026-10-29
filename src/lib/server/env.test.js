import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('isDevAuthBypassAllowed', () => {
	const prevNode = process.env.NODE_ENV;
	const prevBypass = process.env.DEV_BYPASS_AUTH;

	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		if (prevNode === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = prevNode;
		if (prevBypass === undefined) delete process.env.DEV_BYPASS_AUTH;
		else process.env.DEV_BYPASS_AUTH = prevBypass;
		vi.resetModules();
		vi.doUnmock('$env/dynamic/private');
		vi.doUnmock('$env/dynamic/public');
	});

	it('bloquea bypass cuando NODE_ENV=production aunque DEV_BYPASS_AUTH=true', async () => {
		process.env.NODE_ENV = 'production';
		process.env.DEV_BYPASS_AUTH = 'true';
		vi.doMock('$env/dynamic/private', () => ({
			env: { NODE_ENV: 'production', DEV_BYPASS_AUTH: 'true' }
		}));
		vi.doMock('$env/dynamic/public', () => ({ env: {} }));
		const { isDevAuthBypassAllowed } = await import('./env.js');
		expect(isDevAuthBypassAllowed()).toBe(false);
	});

	it('permite bypass fuera de producción', async () => {
		process.env.NODE_ENV = 'development';
		process.env.DEV_BYPASS_AUTH = 'true';
		vi.doMock('$env/dynamic/private', () => ({
			env: { NODE_ENV: 'development', DEV_BYPASS_AUTH: 'true' }
		}));
		vi.doMock('$env/dynamic/public', () => ({ env: {} }));
		const { isDevAuthBypassAllowed } = await import('./env.js');
		expect(isDevAuthBypassAllowed()).toBe(true);
	});
});
