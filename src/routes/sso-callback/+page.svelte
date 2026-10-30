<script>
	/**
	 * Completa el OAuth de Google/Clerk tras el redirect del IdP.
	 * Debe coincidir con redirectUrl de authenticateWithRedirect / SignIn.
	 */
</script>

{#await import('svelte-clerk') then mod}
	<div class="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--color-muted)]">
		<p>Completando inicio de sesión…</p>
		<mod.AuthenticateWithRedirectCallback
			signInForceRedirectUrl="/dashboard"
			signUpForceRedirectUrl="/dashboard"
			signInFallbackRedirectUrl="/dashboard"
			signUpFallbackRedirectUrl="/dashboard"
			signInUrl="/login"
			signUpUrl="/registro"
		/>
	</div>
{/await}
