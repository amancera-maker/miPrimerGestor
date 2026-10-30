<script>
	import {
		SignInButton,
		SignUpButton,
		useClerkContext
	} from 'svelte-clerk';

	/** @type {{ signedOutHint?: boolean }} */
	let { signedOutHint = false } = $props();

	const ctx = useClerkContext();
	let busy = $state(false);
	let errorMsg = $state(/** @type {string | null} */ (null));

	/**
	 * OAuth Google directo. Si falla, el botón modal (abajo) sigue disponible.
	 * @param {'sign_in' | 'sign_up'} intent
	 */
	async function startGoogle(intent) {
		errorMsg = null;
		const clerk = ctx.clerk;
		if (!clerk?.client) {
			errorMsg = 'Clerk aún no terminó de cargar. Espera un segundo y vuelve a intentar.';
			return;
		}
		busy = true;
		try {
			const origin = window.location.origin;
			const params = {
				strategy: /** @type {const} */ ('oauth_google'),
				redirectUrl: `${origin}/sso-callback`,
				redirectUrlComplete: `${origin}/dashboard`
			};
			if (intent === 'sign_up') {
				await clerk.client.signUp.authenticateWithRedirect(params);
			} else {
				await clerk.client.signIn.authenticateWithRedirect(params);
			}
		} catch (e) {
			busy = false;
			const err = /** @type {{ errors?: { longMessage?: string; message?: string }[]; message?: string }} */ (
				e
			);
			errorMsg =
				err?.errors?.[0]?.longMessage ||
				err?.errors?.[0]?.message ||
				err?.message ||
				'No se pudo abrir Google. Prueba «Abrir acceso Clerk» o revisa que Google esté activo en Clerk.';
		}
	}
</script>

{#if signedOutHint}
	<p class="mb-1 text-center text-xs text-[var(--color-muted)]">
		Elige otra cuenta de Google o crea un usuario nuevo.
	</p>
{/if}

{#if errorMsg}
	<p class="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
		{errorMsg}
	</p>
{/if}

<button
	type="button"
	class="btn-primary w-full google-btn"
	disabled={busy || !ctx.isLoaded}
	onclick={() => startGoogle('sign_in')}
>
	{busy ? 'Abriendo Google…' : 'Continuar con Google'}
</button>

<button
	type="button"
	class="btn-secondary w-full google-btn"
	disabled={busy || !ctx.isLoaded}
	onclick={() => startGoogle('sign_up')}
>
	Crear cuenta con Google
</button>

<!-- Fallback: modal Clerk (incluye Google si está habilitado en el dashboard) -->
<SignInButton
	mode="modal"
	forceRedirectUrl="/dashboard"
	fallbackRedirectUrl="/dashboard"
	asChild
>
	{#snippet children({ signIn })}
		<button
			type="button"
			class="btn-secondary w-full"
			disabled={!ctx.isLoaded}
			onclick={signIn}
		>
			Abrir acceso Clerk
		</button>
	{/snippet}
</SignInButton>

<SignUpButton
	mode="modal"
	forceRedirectUrl="/dashboard"
	fallbackRedirectUrl="/dashboard"
	asChild
>
	{#snippet children({ signUp })}
		<button
			type="button"
			class="btn-secondary w-full"
			disabled={!ctx.isLoaded}
			onclick={signUp}
		>
			Crear cuenta (formulario)
		</button>
	{/snippet}
</SignUpButton>

<p class="pt-1 text-center text-sm text-[var(--color-muted)]">
	¿Primera vez?
	<a class="font-semibold text-[var(--color-brand-800)] hover:underline" href="/registro"
		>Crear usuario aquí</a
	>.
</p>

<style>
	.google-btn {
		gap: 0.65rem;
	}
</style>
