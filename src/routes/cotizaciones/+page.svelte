<script>
	import { formatMXN, formatFecha } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
	const f = $derived(data.list.filters);
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="font-display text-3xl text-[var(--color-brand-900)]">Cotizaciones</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">{data.list.total} registros</p>
		</div>
		<a class="btn-primary" href="/cotizaciones/nueva">Nueva cotización</a>
	</div>

	<form method="GET" class="card-panel grid gap-3 md:grid-cols-5">
		<input class="input md:col-span-2" type="search" name="q" value={f.q} placeholder="Número o cliente" />
		<select class="input" name="estado" value={f.estado}>
			<option value="">Todos los estados</option>
			{#each ['BORRADOR','ENVIADA','APROBADA','RECHAZADA','FACTURADA','PAGADA'] as e}
				<option value={e}>{e}</option>
			{/each}
		</select>
		<input class="input" type="date" name="desde" value={f.desde} />
		<input class="input" type="date" name="hasta" value={f.hasta} />
		<button class="btn-secondary md:col-span-5 md:w-fit" type="submit">Filtrar</button>
	</form>

	{#if data.list.items.length === 0}
		<EmptyState title="Sin cotizaciones" description="Crea la primera cotización del despacho." actionHref="/cotizaciones/nueva" actionLabel="Nueva cotización" />
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Número</th>
							<th>Cliente</th>
							<th>Fecha</th>
							<th>Total</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each data.list.items as c}
							<tr class="hover:bg-[var(--color-brand-50)]/60">
								<td><a class="font-medium text-[var(--color-brand-800)] hover:underline" href={`/cotizaciones/${c.id}`}>{c.numero}</a></td>
								<td>{c.cliente.nombre}</td>
								<td>{formatFecha(c.fecha)}</td>
								<td>{formatMXN(c.totalFmt)}</td>
								<td><BadgeEstado estado={c.estado} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<Pagination page={data.list.page} totalPages={data.list.totalPages} baseUrl="/cotizaciones" query={f} />
	{/if}
</div>
