<script>
	import { onMount } from 'svelte';

	/** @type {{ unauthorized?: boolean }} */
	let { unauthorized = false } = $props();

	let stuck = $state(false);

	function goHard() {
		window.location.assign('/dashboard');
	}

	onMount(() => {
		if (unauthorized) return;
		if (document.cookie.includes('gestorpyme_session_ok=1')) {
			sessionStorage.removeItem('gestorpyme_dash_attempt');
		}
		const key = 'gestorpyme_dash_attempt';
		const prev = sessionStorage.getItem(key);
		if (prev === '1') {
			// Ya intentamos y el servidor nos devolvió a /login
			stuck = true;
			sessionStorage.removeItem(key);
			return;
		}
		sessionStorage.setItem(key, '1');
		const t = setTimeout(goHard, 200);
		return () => clearTimeout(t);
	});
</script>

{#if stuck}
	<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
		<p class="font-semibold">El servidor no reconoce la sesión de Clerk</p>
		<p class="mt-2">
			Con claves de <strong>desarrollo</strong> (<code>pk_test_</code> / <code>sk_test_</code>) Clerk
			marca <code>dev-browser-missing</code> en Render y no crea cookie de sesión en el servidor. Por
			eso la app se queda en bucle.
		</p>
		<p class="mt-2 font-medium">Qué hacer:</p>
		<ol class="mt-1 list-decimal space-y-1 pl-5">
			<li>
				En Clerk Dashboard crea una instancia <strong>Production</strong> (o convierte la app).
			</li>
			<li>
				Copia <code>pk_live_…</code> y <code>sk_live_…</code> a Render
				(<code>PUBLIC_CLERK_PUBLISHABLE_KEY</code> y <code>CLERK_SECRET_KEY</code>).
			</li>
			<li>Redeploy y vuelve a iniciar sesión.</li>
		</ol>
		<button type="button" class="btn-secondary mt-4 w-full" onclick={goHard}>Reintentar dashboard</button>
	</div>
{:else}
	<p class="text-sm text-[var(--color-muted)]">Sesión detectada. Entrando al panel…</p>
	<button type="button" class="btn-primary mt-3 w-full" onclick={goHard}>Ir al dashboard</button>
{/if}
