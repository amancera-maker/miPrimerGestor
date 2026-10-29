<script>
	import { page } from '$app/stores';
	import PostLoginRedirect from '$lib/components/PostLoginRedirect.svelte';

	/** @type {{ data: { authMode: string, user: { email: string | null } | null } }} */
	let { data } = $props();

	$effect(() => {
		if (!data.user) return;
		window.location.assign('/dashboard');
	});

	const unauthorized = $derived($page.url.searchParams.get('error') === 'unauthorized');
</script>

<div class="login-root">
	<aside class="login-brand">
		<div class="brand-inner">
			<p class="brand-mark">GestorPyme</p>
			<h1 class="brand-title">Control financiero del despacho, sin hojas sueltas.</h1>
			<p class="brand-copy">
				Clientes, cotizaciones, pagos y cobranza en un solo flujo — pensado para despachos
				contables y consultoras en México.
			</p>
			<ul class="brand-points">
				<li>Cotizaciones con IVA 16% e historial de estados</li>
				<li>Cobranza alineada al saldo real</li>
				<li>Acceso restringido al equipo autorizado</li>
			</ul>
		</div>
	</aside>

	<main class="login-panel">
		<div class="login-card">
			<p class="eyebrow">Acceso al despacho</p>
			<h2 class="panel-title">Iniciar sesión</h2>
			<p class="panel-sub">
				{#if data.authMode === 'bypass'}
					Modo demo: acceso directo al panel (sin Google / sin dominio Clerk).
				{:else}
					Usa la cuenta de Google autorizada para este despliegue.
				{/if}
			</p>

			{#if data.authMode === 'bypass'}
				<a class="btn-primary mt-8 w-full" href="/dashboard">Entrar al panel</a>
				<p class="mt-3 text-xs text-[var(--color-muted)]">
					Activo con <code>AUTH_BYPASS=true</code>. No uses datos reales de clientes en este modo.
				</p>
			{:else if data.authMode === 'clerk'}
				{#await import('svelte-clerk') then mod}
					<div class="mt-8 flex flex-col gap-3">
						<mod.Show when="signed-in">
							{#if unauthorized}
								<p class="text-sm text-[var(--color-danger)]" role="alert">
									Tu cuenta de Google no está en la lista autorizada
									(<code>AUTHORIZED_EMAILS</code>). Cierra sesión e inicia con el correo correcto.
								</p>
								<mod.SignOutButton redirectUrl="/login" asChild>
									{#snippet children({ signOut })}
										<button type="button" class="btn-secondary w-full" onclick={signOut}>
											Cerrar sesión
										</button>
									{/snippet}
								</mod.SignOutButton>
							{:else}
								<PostLoginRedirect />
							{/if}
						</mod.Show>
						<mod.Show when="signed-out">
							{#if unauthorized}
								<p class="mb-2 text-sm text-[var(--color-danger)]" role="alert">
									Esa cuenta no está autorizada para este despacho.
								</p>
							{/if}
							<!-- Redirect (no modal): ayuda al handshake de Clerk en dominios públicos -->
							<mod.SignInButton
								forceRedirectUrl="/dashboard"
								fallbackRedirectUrl="/dashboard"
								asChild
							>
								{#snippet children({ signIn })}
									<button type="button" class="btn-primary w-full google-btn" onclick={signIn}>
										Continuar con Google
									</button>
								{/snippet}
							</mod.SignInButton>
						</mod.Show>
					</div>
				{/await}
			{:else}
				<div class="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
					<p class="font-semibold">Configuración pendiente</p>
					<p class="mt-1">
						Faltan las claves de Clerk en el entorno del servidor. En local puedes usar
						DEV_BYPASS_AUTH=true.
					</p>
				</div>
			{/if}

			<p class="legal">Acceso privado · Un despacho por despliegue</p>
		</div>
	</main>
</div>

<style>
	.login-root {
		display: grid;
		min-height: 100dvh;
		background: var(--color-surface);
	}

	@media (min-width: 900px) {
		.login-root {
			grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		}
	}

	.login-brand {
		display: none;
		position: relative;
		overflow: hidden;
		background:
			linear-gradient(160deg, rgba(7, 26, 20, 0.55), rgba(7, 26, 20, 0.88)),
			radial-gradient(ellipse at 20% 10%, #1a6b4a 0%, transparent 50%),
			linear-gradient(180deg, #0f3d2e, #071a14);
		color: #f3faf7;
		padding: 3rem 3.25rem;
	}

	@media (min-width: 900px) {
		.login-brand {
			display: flex;
			align-items: flex-end;
		}
	}

	.login-brand::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: linear-gradient(180deg, transparent, #000 30%, #000 80%, transparent);
		pointer-events: none;
		opacity: 0.35;
	}

	.brand-inner {
		position: relative;
		z-index: 1;
		max-width: 32rem;
	}

	.brand-mark {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.brand-title {
		margin-top: 1.75rem;
		font-family: var(--font-display);
		font-size: clamp(1.85rem, 2.4vw, 2.55rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.03em;
	}

	.brand-copy {
		margin-top: 1rem;
		max-width: 28rem;
		font-size: 1.05rem;
		line-height: 1.55;
		color: rgba(243, 250, 247, 0.82);
	}

	.brand-points {
		margin-top: 2rem;
		display: grid;
		gap: 0.65rem;
		padding: 0;
		list-style: none;
		font-size: 0.95rem;
		color: rgba(243, 250, 247, 0.9);
	}

	.brand-points li {
		display: flex;
		gap: 0.65rem;
		align-items: flex-start;
	}

	.brand-points li::before {
		content: '';
		margin-top: 0.45rem;
		width: 0.4rem;
		height: 0.4rem;
		flex-shrink: 0;
		border-radius: 999px;
		background: #7dcea0;
	}

	.login-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.25rem;
		background:
			radial-gradient(ellipse at top right, rgba(26, 107, 74, 0.08), transparent 40%),
			var(--color-surface);
	}

	.login-card {
		width: 100%;
		max-width: 26rem;
		border: 1px solid var(--color-line);
		background: #fff;
		padding: 2rem 1.75rem;
		box-shadow: 0 18px 40px rgba(7, 26, 20, 0.06);
	}

	@media (min-width: 640px) {
		.login-card {
			padding: 2.5rem 2.25rem;
		}
	}

	.eyebrow {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand-700);
	}

	.panel-title {
		margin-top: 0.5rem;
		font-family: var(--font-display);
		font-size: 1.85rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-brand-950);
	}

	.panel-sub {
		margin-top: 0.5rem;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--color-muted);
	}

	.google-btn {
		gap: 0.65rem;
	}

	.legal {
		margin-top: 1.75rem;
		font-size: 0.75rem;
		color: var(--color-muted);
		text-align: center;
	}

	@media (max-width: 899px) {
		.login-panel {
			min-height: 100dvh;
		}

		.login-card::before {
			content: 'GestorPyme';
			display: block;
			margin-bottom: 1.25rem;
			font-family: var(--font-display);
			font-size: 1.5rem;
			font-weight: 700;
			color: var(--color-brand-900);
		}
	}
</style>
