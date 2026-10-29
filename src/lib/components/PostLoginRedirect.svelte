<script>
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';

	/** @type {{ unauthorized?: boolean }} */
	let { unauthorized = false } = $props();

	onMount(() => {
		if (unauthorized) return;
		(async () => {
			try {
				await invalidateAll();
				await goto('/dashboard', { invalidateAll: true, replaceState: true });
			} catch {
				window.location.assign('/dashboard');
			}
		})();
	});
</script>

<p class="text-sm text-[var(--color-muted)]">Sesión detectada. Entrando al panel…</p>
<a class="btn-primary mt-3 inline-flex w-full" href="/dashboard">Ir al dashboard</a>
