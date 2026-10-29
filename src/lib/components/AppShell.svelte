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

<div class="shell min-h-dvh w-full max-w-[100vw] overflow-x-hidden lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
	<aside class="sidebar hidden lg:flex lg:flex-col" aria-label="Navegación">
		<div class="sidebar-brand">
			<div class="brand-mark-row">
				<span class="brand-glyph" aria-hidden="true"></span>
				<div>
					<p class="font-display text-[1.45rem] leading-none tracking-tight text-white">GestorPyme</p>
					<p class="mt-1.5 text-[0.7rem] font-medium tracking-[0.04em] text-white/55 uppercase">
						Despacho financiero
					</p>
				</div>
			</div>
		</div>
		<nav class="flex flex-1 flex-col gap-1 px-3 pb-6" aria-label="Principal">
			{#each nav as item}
				<a
					href={item.href}
					class="nav-link {active(item.href) ? 'nav-link-active' : ''}"
					aria-current={active(item.href) ? 'page' : undefined}
				>
					<span class="nav-dot" aria-hidden="true"></span>
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="sidebar-foot">
			<p class="text-[0.7rem] leading-snug text-white/45">
				Clientes · Cotizaciones · Cobranza
			</p>
		</div>
	</aside>

	{#if mobileOpen}
		<div class="fixed inset-0 z-50 lg:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-[rgb(6_21_16/0.55)] backdrop-blur-[2px]"
				aria-label="Cerrar menú"
				onclick={() => (mobileOpen = false)}
			></button>
			<aside class="sidebar absolute inset-y-0 left-0 flex w-[min(100%,18.5rem)] flex-col shadow-2xl">
				<div class="flex items-center justify-between px-4 py-4">
					<p class="font-display text-xl text-white">GestorPyme</p>
					<button
						type="button"
						class="rounded-lg px-2.5 py-1.5 text-sm text-white/80 hover:bg-white/10"
						onclick={() => (mobileOpen = false)}>✕</button
					>
				</div>
				<nav class="flex flex-col gap-1 px-3 pb-6">
					{#each nav as item}
						<a
							href={item.href}
							class="nav-link {active(item.href) ? 'nav-link-active' : ''}"
							aria-current={active(item.href) ? 'page' : undefined}
						>
							<span class="nav-dot" aria-hidden="true"></span>
							{item.label}
						</a>
					{/each}
				</nav>
			</aside>
		</div>
	{/if}

	<div class="flex min-w-0 flex-col">
		<header class="topbar sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
			<div class="flex min-w-0 items-center gap-2">
				<button
					type="button"
					class="btn-secondary shrink-0 px-2.5 py-1.5 text-sm lg:hidden"
					onclick={() => (mobileOpen = true)}
					aria-label="Abrir menú"
				>
					Menú
				</button>
				<p class="truncate font-display text-base text-[var(--color-brand-900)] lg:hidden">
					GestorPyme
				</p>
			</div>
			<div class="flex min-w-0 items-center gap-2.5 sm:gap-3">
				{#if user.imageUrl}
					<img
						src={user.imageUrl}
						alt=""
						class="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm sm:h-9 sm:w-9"
					/>
				{:else}
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(145deg,var(--color-brand-100),var(--color-brand-50))] text-xs font-bold text-[var(--color-brand-900)] ring-2 ring-white shadow-sm sm:h-9 sm:w-9 sm:text-sm"
					>
						{(user.fullName || user.email || 'U').slice(0, 1).toUpperCase()}
					</div>
				{/if}
				<div class="hidden min-w-0 text-right sm:block">
					<p class="max-w-[10rem] truncate text-sm font-semibold tracking-tight md:max-w-[16rem]">
						{user.fullName || 'Usuario'}
					</p>
					<p class="max-w-[10rem] truncate text-xs text-[var(--color-muted)] md:max-w-[16rem]">
						{user.email || ''}
					</p>
				</div>
				<form method="POST" action="/logout" class="shrink-0">
					<button type="submit" class="btn-secondary px-2.5 py-1.5 text-sm sm:px-3">Salir</button>
				</form>
			</div>
		</header>
		<main class="shell-main mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-auto px-3 py-5 sm:px-6 sm:py-7">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.sidebar {
		position: relative;
		overflow: hidden;
		border-right: 1px solid rgb(255 255 255 / 0.06);
		background:
			radial-gradient(ellipse 90% 50% at 0% 0%, rgb(31 138 104 / 0.35), transparent 55%),
			radial-gradient(ellipse 70% 40% at 100% 100%, rgb(17 69 54 / 0.45), transparent 50%),
			linear-gradient(165deg, #0b2f24 0%, #061510 55%, #0a1c16 100%);
		color: #fff;
	}
	.sidebar::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgb(255 255 255 / 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgb(255 255 255 / 0.03) 1px, transparent 1px);
		background-size: 36px 36px;
		mask-image: linear-gradient(180deg, #000 0%, transparent 75%);
		pointer-events: none;
		opacity: 0.5;
	}
	.sidebar-brand {
		position: relative;
		z-index: 1;
		padding: 1.5rem 1.25rem 1.25rem;
	}
	.brand-mark-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.brand-glyph {
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 0.75rem;
		background:
			linear-gradient(145deg, rgb(255 255 255 / 0.22), transparent 50%),
			linear-gradient(180deg, #1f8a68, #114536);
		box-shadow:
			0 8px 20px rgb(0 0 0 / 0.25),
			inset 0 1px 0 rgb(255 255 255 / 0.25);
		flex-shrink: 0;
	}
	.sidebar-foot {
		position: relative;
		z-index: 1;
		margin-top: auto;
		border-top: 1px solid rgb(255 255 255 / 0.08);
		padding: 1rem 1.25rem 1.25rem;
	}
	:global(.nav-link) {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.65rem;
		border-radius: 0.7rem;
		padding: 0.7rem 0.85rem;
		font-size: 0.875rem;
		font-weight: 550;
		letter-spacing: -0.01em;
		color: rgb(255 255 255 / 0.68);
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			box-shadow 0.15s ease;
	}
	:global(.nav-link:hover) {
		background: rgb(255 255 255 / 0.08);
		color: #fff;
	}
	:global(.nav-link-active) {
		background: linear-gradient(90deg, rgb(31 138 104 / 0.35), rgb(255 255 255 / 0.1));
		color: #fff;
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
	}
	:global(.nav-dot) {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.28);
		flex-shrink: 0;
	}
	:global(.nav-link-active .nav-dot) {
		background: #7dcea0;
		box-shadow: 0 0 0 3px rgb(125 206 160 / 0.25);
	}
	.topbar {
		border-bottom: 1px solid rgb(211 224 217 / 0.85);
		background: rgb(255 255 255 / 0.78);
		backdrop-filter: blur(14px) saturate(1.2);
		box-shadow: 0 1px 0 rgb(255 255 255 / 0.6);
	}
</style>
