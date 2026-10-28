<script>
	/** @type {{ title: string, description?: string, actionHref?: string, actionLabel?: string }} */
	let { title, description = '', actionHref = '', actionLabel = '' } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-line)] bg-white px-6 py-12 text-center">
	<div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</div>
	<h3 class="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
	{/if}
	{#if actionHref && actionLabel}
		<a class="btn-primary mt-5" href={actionHref}>{actionLabel}</a>
	{/if}
</div>
