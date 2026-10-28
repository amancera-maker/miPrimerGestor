<script>
	/** @type {{ open: boolean, title: string, onclose: () => void, children: import('svelte').Snippet, footer?: import('svelte').Snippet }} */
	let { open, title, onclose, children, footer } = $props();

	function onKey(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<div class="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6">
		<button
			type="button"
			class="absolute inset-0 bg-black/40"
			aria-label="Cerrar"
			onclick={onclose}
		></button>
		<div
			class="relative z-10 flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div class="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
				<h2 class="text-lg font-semibold text-[var(--color-brand-900)]">{title}</h2>
				<button type="button" class="btn-ghost min-h-10 px-2" onclick={onclose}>✕</button>
			</div>
			<div class="overflow-y-auto px-4 py-4">
				{@render children()}
			</div>
			{#if footer}
				<div class="border-t border-[var(--color-line)] px-4 py-3">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
