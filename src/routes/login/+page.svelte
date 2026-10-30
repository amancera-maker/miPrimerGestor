<script>
	import { page } from '$app/stores';
	import PostLoginRedirect from '$lib/components/PostLoginRedirect.svelte';
	import GoogleAuthButtons from '$lib/components/GoogleAuthButtons.svelte';

	/** @type {{ data: { authMode: string, user: { email: string | null } | null, signedOut?: boolean, unauthorized?: boolean } }} */
	let { data } = $props();

	const unauthorized = $derived(
		data.unauthorized || $page.url.searchParams.get('error') === 'unauthorized'
	);
	const signedOut = $derived(
		data.signedOut || $page.url.searchParams.get('signedOut') === '1'
	);

	$effect(() => {
		// Tras cerrar sesión, no rebotar al dashboard aunque quede cache breve
		if (signedOut) return;
		if (!data.user) return;
		window.location.assign('/dashboard');
	});
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
					Entra con Google o crea una cuenta nueva. Solo correos autorizados pueden usar el panel.
				{/if}
			</p>

			{#if signedOut}
				<p class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
					Sesión cerrada. Puedes entrar con otra cuenta o crear un usuario nuevo.
				</p>
			{/if}

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
								<mod.SignOutButton redirectUrl="/login?signedOut=1" asChild>
									{#snippet children({ signOut })}
										<button type="button" class="btn-secondary w-full" onclick={signOut}>
											Cerrar sesión
										</button>
									{/snippet}
								</mod.SignOutButton>
							{:else if signedOut}
								<!-- Forzar cierre si aún hay sesión Clerk residual -->
								<mod.SignOutButton redirectUrl="/login?signedOut=1" asChild>
									{#snippet children({ signOut })}
										<button
											type="button"
											class="btn-primary w-full"
											onclick={signOut}
										>
											Confirmar cierre de sesión
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
							<!-- OAuth directo a Google (SignInButton sin modal solo redirigía a /login) -->
							<GoogleAuthButtons signedOutHint={signedOut} />
							<details class="mt-2 rounded-xl border border-[var(--color-border)] bg-white p-2">
								<summary class="cursor-pointer px-2 py-1 text-sm text-[var(--color-muted)]">
									Otras opciones de acceso
								</summary>
								<div class="overflow-hidden p-1">
									<mod.SignIn
										routing="path"
										path="/login"
										signUpUrl="/registro"
										forceRedirectUrl="/dashboard"
										fallbackRedirectUrl="/dashboard"
									/>
								</div>
							</details>
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

			<p class="legal">Login Google (Clerk) · Rutas del panel protegidas</p>
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
		border: 1px solid rgb(211 224 217 / 0.95);
		border-radius: 1.15rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), #fff),
			#fff;
		padding: 2rem 1.75rem;
		box-shadow:
			0 1px 2px rgb(6 21 16 / 0.04),
			0 18px 44px rgb(6 21 16 / 0.1);
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
