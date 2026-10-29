<script>
	/** @type {{ title: string, description?: string, actionHref?: string, actionLabel?: string }} */
	let { title, description = '', actionHref = '', actionLabel = '' } = $props();
</script>

<div
	class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line-strong)] bg-[linear-gradient(180deg,#fff,#f6faf8)] px-6 py-14 text-center shadow-[var(--shadow-xs)]"
>
	<div
		class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(145deg,var(--color-brand-100),var(--color-brand-50))] text-[var(--color-brand-800)] shadow-sm"
	>
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</div>
	<h3 class="font-display text-lg font-semibold tracking-tight text-[var(--color-ink)]">{title}</h3>
	{#if description}
		<p class="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
	{/if}
	{#if actionHref && actionLabel}
		<a class="btn-primary mt-6" href={actionHref}>{actionLabel}</a>
	{/if}
</div>
