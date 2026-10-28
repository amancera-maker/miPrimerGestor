<script>
	/** @type {{ user: { fullName: string | null, email: string | null, imageUrl: string | null }, pathname: string, children: import('svelte').Snippet }} */
	let { user, pathname, children } = $props();

	let mobileOpen = $state(false);

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'grid' },
		{ href: '/clientes', label: 'Clientes', icon: 'users' },
		{ href: '/cotizaciones', label: 'Cotizaciones', icon: 'file' },
		{ href: '/cobranza', label: 'Cobranza', icon: 'wallet' },
		{ href: '/reportes', label: 'Reportes', icon: 'chart' }
	];

	/**
	 * @param {string} href
	 */
	function active(href) {
		return pathname === href || pathname.startsWith(href + '/');
	}

	$effect(() => {
		pathname;
		mobileOpen = false;
	});
</script>

<div class="min-h-dvh lg:grid lg:grid-cols-[16.5rem_1fr]">
	<!-- Desktop sidebar -->
	<aside class="hidden border-r border-[var(--color-line)] bg-[var(--color-brand-950)] text-white lg:flex lg:flex-col">
		<div class="px-5 py-6">
			<p class="font-display text-2xl tracking-tight">GestorPyme</p>
			<p class="mt-1 text-xs text-white/60">Clientes · Cotizaciones · Cobranza</p>
		</div>
		<nav class="flex flex-1 flex-col gap-1 px-3 pb-6" aria-label="Principal">
			{#each nav as item}
				<a
					href={item.href}
					class="rounded-lg px-3 py-2.5 text-sm font-medium transition {active(item.href)
						? 'bg-white/15 text-white'
						: 'text-white/70 hover:bg-white/10 hover:text-white'}"
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>

	<!-- Mobile drawer -->
	{#if mobileOpen}
		<div class="fixed inset-0 z-50 lg:hidden">
			<button type="button" class="absolute inset-0 bg-black/40" aria-label="Cerrar menú" onclick={() => (mobileOpen = false)}></button>
			<aside class="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-[var(--color-brand-950)] text-white shadow-xl">
				<div class="flex items-center justify-between px-4 py-4">
					<p class="font-display text-xl">GestorPyme</p>
					<button type="button" class="btn-ghost text-white" onclick={() => (mobileOpen = false)}>✕</button>
				</div>
				<nav class="flex flex-col gap-1 px-3 pb-6">
					{#each nav as item}
						<a
							href={item.href}
							class="rounded-lg px-3 py-3 text-sm font-medium {active(item.href) ? 'bg-white/15' : 'text-white/80'}"
						>
							{item.label}
						</a>
					{/each}
				</nav>
			</aside>
		</div>
	{/if}

	<div class="flex min-w-0 flex-col">
		<header class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-white/90 px-3 py-3 backdrop-blur sm:px-6">
			<div class="flex min-w-0 items-center gap-2">
				<button type="button" class="btn-secondary lg:hidden" onclick={() => (mobileOpen = true)} aria-label="Abrir menú">
					Menú
				</button>
				<p class="truncate font-display text-lg text-[var(--color-brand-900)] lg:hidden">GestorPyme</p>
			</div>
			<div class="flex min-w-0 items-center gap-3">
				{#if user.imageUrl}
					<img src={user.imageUrl} alt="" class="h-9 w-9 rounded-full object-cover" />
				{:else}
					<div class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-sm font-semibold text-[var(--color-brand-900)]">
						{(user.fullName || user.email || 'U').slice(0, 1).toUpperCase()}
					</div>
				{/if}
				<div class="min-w-0 text-right">
					<p class="truncate text-sm font-semibold">{user.fullName || 'Usuario'}</p>
					<p class="truncate text-xs text-[var(--color-muted)]">{user.email || ''}</p>
				</div>
				<form method="POST" action="/logout">
					<button type="submit" class="btn-secondary">Salir</button>
				</form>
			</div>
		</header>
		<main class="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
			{@render children()}
		</main>
	</div>
</div>
