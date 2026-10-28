<script>
	import { page } from '$app/stores';

	/** @type {{ data: { authMode: string } }} */
	let { data } = $props();
</script>

<div class="relative min-h-dvh overflow-hidden">
	<div
		class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#1a6b4a_0%,_transparent_45%),radial-gradient(ellipse_at_bottom_right,_#0f3d2e_0%,_#071a14_55%)]"
	></div>
	<div class="login-pattern absolute inset-0 opacity-30" aria-hidden="true"></div>

	<div class="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
		<div class="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
			<p class="font-display text-4xl text-[var(--color-brand-900)] sm:text-5xl">GestorPyme</p>
			<p class="mt-3 text-base text-[var(--color-muted)]">
				Gestiona clientes, cotizaciones y cobranza de tu despacho en un solo lugar.
			</p>

			{#if data.authMode === 'bypass'}
				<a class="btn-primary mt-8 w-full" href="/dashboard">Entrar (modo desarrollo)</a>
			{:else if data.authMode === 'clerk'}
				{#await import('svelte-clerk') then mod}
					<div class="mt-8 flex flex-col gap-3">
						<mod.SignInButton mode="modal">
							<button type="button" class="btn-primary w-full">Iniciar sesión con Google</button>
						</mod.SignInButton>
					</div>
				{/await}
			{:else}
				<div class="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
					<p class="font-semibold">Configuración pendiente</p>
					<p class="mt-1">
						Define PUBLIC_CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY en .env, o usa DEV_BYPASS_AUTH=true para
						desarrollo local.
					</p>
				</div>
			{/if}

			{#if $page.url.searchParams.get('error') === 'unauthorized'}
				<p class="mt-4 text-sm text-[var(--color-danger)]">
					Tu cuenta de Google no está autorizada para este despacho.
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.login-pattern {
		background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
		background-size: 24px 24px;
	}
</style>
