<script>
	import { formatMXN, formatFecha } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	let filtroEstado = $state('');
	let filtroCliente = $state('');

	const filtradas = $derived.by(() => {
		return (data.cotizaciones ?? []).filter((c) => {
			if (filtroEstado && c.estado !== filtroEstado) return false;
			if (filtroCliente && c.clienteId !== filtroCliente) return false;
			return true;
		});
	});
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="font-display text-3xl text-[var(--color-brand-900)]">Cotizaciones</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">
				{filtradas.length} de {data.cotizaciones.length}
			</p>
		</div>
		<a class="btn-primary" href="/cotizaciones/nueva">Nueva cotización</a>
	</div>

	<div class="card-panel grid gap-3 sm:grid-cols-2">
		<div>
			<label class="label" for="filtro-estado">Estado</label>
			<select class="input" id="filtro-estado" bind:value={filtroEstado}>
				<option value="">Todos los estados</option>
				{#each ['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'FACTURADA', 'PAGADA'] as e}
					<option value={e}>{e}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label" for="filtro-cliente">Cliente</label>
			<select class="input" id="filtro-cliente" bind:value={filtroCliente}>
				<option value="">Todos los clientes</option>
				{#each data.clientesFiltro as cl}
					<option value={cl.id}>{cl.nombre}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if filtradas.length === 0}
		<EmptyState
			title="Sin cotizaciones"
			description="Crea la primera cotización del despacho o ajusta los filtros."
			actionHref="/cotizaciones/nueva"
			actionLabel="Nueva cotización"
		/>
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Número</th>
							<th>Cliente</th>
							<th>Fecha</th>
							<th>Vencimiento</th>
							<th>Total</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each filtradas as c (c.id)}
							<tr class="hover:bg-[var(--color-brand-50)]/60">
								<td>
									<a
										class="font-medium text-[var(--color-brand-800)] hover:underline"
										href={`/cotizaciones/${c.id}`}>{c.numero}</a
									>
								</td>
								<td>{c.cliente?.nombre ?? '—'}</td>
								<td>{formatFecha(c.fecha)}</td>
								<td>{formatFecha(c.vencimiento)}</td>
								<td>{formatMXN(c.totalFmt)}</td>
								<td><BadgeEstado estado={c.estado} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
