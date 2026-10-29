import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		setupFiles: ['./tests/setup.js'],
		fileParallelism: false,
		pool: 'forks',
		poolOptions: {
			forks: { singleFork: true }
		},
		testTimeout: 60000,
		hookTimeout: 60000
	}
});
