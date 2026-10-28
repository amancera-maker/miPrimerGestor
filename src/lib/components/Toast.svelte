<script>
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	/**
	 * @typedef {{ id: number, type: 'success' | 'error' | 'info', message: string }} ToastItem
	 */

	/** @type {{ toasts: ToastItem[], ondismiss: (id: number) => void }} */
	let { toasts, ondismiss } = $props();
</script>

<div
	class="pointer-events-none fixed right-3 bottom-3 z-[80] flex w-[min(100%-1.5rem,24rem)] flex-col gap-2"
	aria-live="polite"
>
	{#each toasts as t (t.id)}
		<div
			class="pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg {t.type === 'success'
				? 'border-emerald-200 bg-emerald-50 text-emerald-900'
				: t.type === 'error'
					? 'border-red-200 bg-red-50 text-red-900'
					: 'border-slate-200 bg-white text-slate-800'}"
			animate:flip={{ duration: 200 }}
			transition:fly={{ y: 16, duration: 200 }}
			role="status"
		>
			<div class="flex items-start justify-between gap-3">
				<p>{t.message}</p>
				<button
					type="button"
					class="text-xs font-semibold opacity-70 hover:opacity-100"
					onclick={() => ondismiss(t.id)}>Cerrar</button
				>
			</div>
		</div>
	{/each}
</div>
