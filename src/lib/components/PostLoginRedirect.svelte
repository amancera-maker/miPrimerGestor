<script>
	import { onMount } from 'svelte';

	/** @type {{ unauthorized?: boolean }} */
	let { unauthorized = false } = $props();

	function goHard() {
		// Navegación dura: evita soft-nav de SvelteKit que rebota a /login
		window.location.assign('/dashboard');
	}

	onMount(() => {
		if (unauthorized) return;
		const t = setTimeout(goHard, 150);
		return () => clearTimeout(t);
	});
</script>

<p class="text-sm text-[var(--color-muted)]">Sesión detectada. Entrando al panel…</p>
<button type="button" class="btn-primary mt-3 w-full" onclick={goHard}>Ir al dashboard</button>
