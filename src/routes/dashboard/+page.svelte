<script>
	import { onMount } from 'svelte';
	import { formatMXN, formatFecha } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';

	/** @type {{ data: { dashboard: any, error?: string } }} */
	let { data } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let barsEl = $state();
	/** @type {HTMLCanvasElement | undefined} */
	let donutEl = $state();
	/** @type {import('chart.js').Chart[]} */
	let charts = [];

	onMount(async () => {
		try {
			sessionStorage.removeItem('gestorpyme_dash_attempt');
		} catch {
			/* ignore */
		}
		if (!data.dashboard) return;
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		if (barsEl) {
			charts.push(
				new Chart(barsEl, {
					type: 'bar',
					data: {
						labels: data.dashboard.ingresosPorMes.map((/** @type {any} */ x) => x.mes),
						datasets: [
							{
								label: 'Cobrado',
								data: data.dashboard.ingresosPorMes.map((/** @type {any} */ x) => x.total),
								backgroundColor: '#1a6b4a'
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: { legend: { display: false } },
						scales: { y: { beginAtZero: true } }
					}
				})
			);
		}

		if (donutEl) {
			const labels = data.dashboard.porEstado.map((/** @type {any} */ x) => x.estado);
			const values = data.dashboard.porEstado.map((/** @type {any} */ x) => x.total);
			charts.push(
				new Chart(donutEl, {
					type: 'doughnut',
					data: {
						labels,
						datasets: [
							{
								data: values,
								backgroundColor: ['#7dd3fc', '#fbbf24', '#34d399', '#f87171', '#c4b5fd', '#94a3b8']
							}
						]
					},
					options: { responsive: true, maintainAspectRatio: false }
				})
			);
		}

		return () => charts.forEach((c) => c.destroy());
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="font-display text-3xl text-[var(--color-brand-900)]">Dashboard</h1>
		<p class="mt-1 text-sm text-[var(--color-muted)]">Indicadores financieros del despacho</p>
	</div>

	{#if data.error}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{data.error}</div>
	{:else if data.dashboard}
		{@const k = data.dashboard.kpis}
		<div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
			<div class="card-panel min-w-0">
				<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">Facturado del mes</p>
				<p class="mt-2 break-all text-xl font-semibold sm:text-2xl">{formatMXN(k.facturadoMes)}</p>
			</div>
			<div class="card-panel min-w-0">
				<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">Cobrado del mes</p>
				<p class="mt-2 break-all text-xl font-semibold sm:text-2xl">{formatMXN(k.cobradoMes)}</p>
			</div>
			<div class="card-panel min-w-0">
				<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">Cartera pendiente</p>
				<p class="mt-2 break-all text-xl font-semibold sm:text-2xl">{formatMXN(k.carteraPendiente)}</p>
			</div>
			<div class="card-panel min-w-0">
				<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">Cotizaciones activas</p>
				<p class="mt-2 text-xl font-semibold sm:text-2xl">{k.cotizacionesActivas}</p>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-3 font-semibold">Ingresos cobrados (6 meses)</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64"><canvas class="max-w-full" bind:this={barsEl}></canvas></div>
			</div>
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-3 font-semibold">Cotizaciones por estado</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64"><canvas class="max-w-full" bind:this={donutEl}></canvas></div>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel">
				<h2 class="mb-3 font-semibold">Cotizaciones recientes</h2>
				{#if data.dashboard.recientes.length === 0}
					<p class="text-sm text-[var(--color-muted)]">Aún no hay cotizaciones.</p>
				{:else}
					<ul class="divide-y divide-[var(--color-line)]">
						{#each data.dashboard.recientes as c}
							<li class="flex items-center justify-between gap-3 py-3 text-sm">
								<div class="min-w-0">
									<a class="font-medium text-[var(--color-brand-800)] hover:underline" href={`/cotizaciones/${c.id}`}
										>{c.numero}</a
									>
									<p class="truncate text-[var(--color-muted)]">{c.cliente} · {formatFecha(c.fecha)}</p>
								</div>
								<div class="text-right">
									<p class="font-medium">{formatMXN(c.total)}</p>
									<BadgeEstado estado={c.estado} />
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
			<div class="card-panel">
				<h2 class="mb-3 font-semibold">Mayor saldo pendiente</h2>
				{#if data.dashboard.topClientes.length === 0}
					<p class="text-sm text-[var(--color-muted)]">Sin cartera pendiente.</p>
				{:else}
					<ul class="divide-y divide-[var(--color-line)]">
						{#each data.dashboard.topClientes as c}
							<li class="flex items-center justify-between py-3 text-sm">
								<a class="font-medium hover:underline" href={`/clientes/${c.clienteId}`}>{c.nombre}</a>
								<span class="font-semibold text-[var(--color-danger)]">{formatMXN(c.pendiente)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</div>
