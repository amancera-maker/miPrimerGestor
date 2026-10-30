<script>
	import { formatMXN, formatFecha } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	let filtroEstado = $state('');
	let filtroCliente = $state('');
	let filtroDesde = $state('');
	let filtroHasta = $state('');

	/**
	 * Día de la cotización en formato YYYY-MM-DD (UTC, igual que la fecha en pantalla).
	 * @param {string | Date | null | undefined} value
	 */
	function diaCotizacion(value) {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return d.toISOString().slice(0, 10);
	}

	const filtradas = $derived.by(() => {
		const desde = filtroDesde;
		const hasta = filtroHasta;
		return (data.cotizaciones ?? []).filter((c) => {
			if (filtroEstado && c.estado !== filtroEstado) return false;
			if (filtroCliente && c.clienteId !== filtroCliente) return false;
			const dia = diaCotizacion(c.fecha);
			if (!dia) return false;
			if (desde && dia < desde) return false;
			if (hasta && dia > hasta) return false;
			return true;
		});
	});

	const hayFiltros = $derived(
		Boolean(filtroEstado || filtroCliente || filtroDesde || filtroHasta)
	);

	function limpiarFiltros() {
		filtroEstado = '';
		filtroCliente = '';
		filtroDesde = '';
		filtroHasta = '';
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<header class="page-header">
			<h1>Cotizaciones</h1>
			<p>{filtradas.length} de {data.cotizaciones.length}</p>
		</header>
		<a class="btn-primary" href="/cotizaciones/nueva">Nueva cotización</a>
	</div>

	<div class="card-panel grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
		<div>
			<label class="label" for="filtro-desde">Desde</label>
			<input class="input" id="filtro-desde" type="date" bind:value={filtroDesde} />
		</div>
		<div>
			<label class="label" for="filtro-hasta">Hasta</label>
			<input
				class="input"
				id="filtro-hasta"
				type="date"
				bind:value={filtroHasta}
				min={filtroDesde || undefined}
			/>
		</div>
	</div>
	{#if hayFiltros}
		<div class="flex justify-end">
			<button type="button" class="btn-secondary" onclick={limpiarFiltros}>Quitar filtros</button>
		</div>
	{/if}

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
