<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import AppShell from '$lib/components/AppShell.svelte';

	/** @type {{ data: any, children: import('svelte').Snippet }} */
	let { data, children } = $props();

	const shellPaths = ['/dashboard', '/clientes', '/cotizaciones', '/cobranza', '/reportes'];

	let useShell = $derived(shellPaths.some((p) => $page.url.pathname === p || $page.url.pathname.startsWith(p + '/')));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<title>GestorPyme</title>
</svelte:head>

{#if data.authMode === 'clerk'}
	{#await import('svelte-clerk') then mod}
		<mod.ClerkProvider
			{...data}
			signInForceRedirectUrl="/dashboard"
			signUpForceRedirectUrl="/dashboard"
			signInFallbackRedirectUrl="/dashboard"
			signUpFallbackRedirectUrl="/dashboard"
			afterSignOutUrl="/login"
		>
			{#if useShell && data.user}
				<AppShell user={data.user} pathname={$page.url.pathname}>
					{@render children()}
				</AppShell>
			{:else}
				{@render children()}
			{/if}
		</mod.ClerkProvider>
	{/await}
{:else if useShell && data.user}
	<AppShell user={data.user} pathname={$page.url.pathname}>
		{@render children()}
	</AppShell>
{:else}
	{@render children()}
{/if}
