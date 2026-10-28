<script>
	/** @type {{ page: number, totalPages: number, baseUrl: string, query?: Record<string, string | number | boolean | undefined> }} */
	let { page, totalPages, baseUrl, query = {} } = $props();

	/**
	 * @param {number} p
	 */
	function hrefFor(p) {
		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(query)) {
			if (v !== undefined && v !== '' && v !== false) params.set(k, String(v));
		}
		params.set('page', String(p));
		const qs = params.toString();
		return `${baseUrl}?${qs}`;
	}
</script>

{#if totalPages > 1}
	<nav class="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginación">
		<p class="text-[var(--color-muted)]">Página {page} de {totalPages}</p>
		<div class="flex gap-2">
			{#if page > 1}
				<a class="btn-secondary" href={hrefFor(page - 1)}>Anterior</a>
			{:else}
				<span class="btn-secondary opacity-50">Anterior</span>
			{/if}
			{#if page < totalPages}
				<a class="btn-secondary" href={hrefFor(page + 1)}>Siguiente</a>
			{:else}
				<span class="btn-secondary opacity-50">Siguiente</span>
			{/if}
		</div>
	</nav>
{/if}
