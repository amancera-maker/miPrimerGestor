<script>
	/** @type {{ authMode?: string, class?: string }} */
	let { authMode = 'clerk', class: className = 'btn-secondary px-2.5 py-1.5 text-sm sm:px-3' } =
		$props();
</script>

{#if authMode === 'clerk'}
	{#await import('svelte-clerk') then mod}
		<mod.SignOutButton redirectUrl="/login?signedOut=1" asChild>
			{#snippet children({ signOut })}
				<button
					type="button"
					class={className}
					onclick={() => {
						signOut();
					}}
				>
					Salir
				</button>
			{/snippet}
		</mod.SignOutButton>
	{/await}
{:else}
	<form method="POST" action="/logout" class="shrink-0">
		<button type="submit" class={className}>Salir</button>
	</form>
{/if}
