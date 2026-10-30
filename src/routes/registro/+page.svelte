<script>
	/** @type {{ data: { authMode: string, user: { email: string | null } | null } }} */
	let { data } = $props();

	$effect(() => {
		if (!data.user) return;
		window.location.assign('/dashboard');
	});
</script>

<div class="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
	<a href="/login" class="mb-6 text-sm text-[var(--color-brand-800)] hover:underline"
		>← Volver al inicio de sesión</a
	>
	<header class="page-header mb-6">
		<h1>Crear cuenta</h1>
		<p>Regístrate con Google. Solo correos autorizados pueden entrar al panel.</p>
	</header>

	{#if data.authMode === 'bypass'}
		<a class="btn-primary w-full" href="/dashboard">Entrar al panel (modo demo)</a>
	{:else if data.authMode === 'clerk'}
		{#await import('svelte-clerk') then mod}
			<div class="card-panel overflow-hidden p-2 sm:p-4">
				<mod.SignUp
					routing="path"
					path="/registro"
					signInUrl="/login"
					forceRedirectUrl="/dashboard"
					fallbackRedirectUrl="/dashboard"
				/>
			</div>
			<p class="mt-4 text-center text-sm text-[var(--color-muted)]">
				¿Ya tienes cuenta?
				<a class="font-semibold text-[var(--color-brand-800)] hover:underline" href="/login"
					>Inicia sesión</a
				>
			</p>
		{/await}
	{:else}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
			Faltan las claves de Clerk en el servidor.
		</div>
	{/if}
</div>
