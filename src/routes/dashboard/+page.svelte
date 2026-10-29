<script>
	import { onMount } from 'svelte';
	import { formatMXN, formatFecha, ESTADO_LABEL } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	/** @type {HTMLCanvasElement | undefined} */
	let barsEl = $state();
	/** @type {HTMLCanvasElement | undefined} */
	let donutEl = $state();
	/** @type {import('chart.js').Chart[]} */
	let charts = [];

	const MESES = [
		'Ene',
		'Feb',
		'Mar',
		'Abr',
		'May',
		'Jun',
		'Jul',
		'Ago',
		'Sep',
		'Oct',
		'Nov',
		'Dic'
	];

	/**
	 * @param {string} key YYYY-MM
	 */
	function labelMes(key) {
		const [y, m] = key.split('-').map(Number);
		if (!y || !m) return key;
		return `${MESES[m - 1]} ${String(y).slice(2)}`;
	}

	onMount(async () => {
		try {
			sessionStorage.removeItem('gestorpyme_dash_attempt');
		} catch {
			/* ignore */
		}
		if (!data.ingresosPorMes?.length && !data.cotsPorEstado?.length) return;

		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		if (barsEl && data.ingresosPorMes?.length) {
			charts.push(
				new Chart(barsEl, {
					type: 'bar',
					data: {
						labels: data.ingresosPorMes.map((/** @type {any} */ x) => labelMes(x.mes)),
						datasets: [
							{
								label: 'Cobrado (MXN)',
								data: data.ingresosPorMes.map((/** @type {any} */ x) => Number(x.total)),
								backgroundColor: '#1a6b4a',
								borderRadius: 6
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false },
							tooltip: {
								callbacks: {
									label: (ctx) => formatMXN(ctx.parsed.y ?? 0)
								}
							}
						},
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: (v) => formatMXN(Number(v))
								}
							}
						}
					}
				})
			);
		}

		if (donutEl && data.cotsPorEstado?.length) {
			const labels = data.cotsPorEstado.map(
				(/** @type {any} */ x) => ESTADO_LABEL[x.estado] ?? x.estado
			);
			const values = data.cotsPorEstado.map((/** @type {any} */ x) => x.total);
			charts.push(
				new Chart(donutEl, {
					type: 'doughnut',
					data: {
						labels,
						datasets: [
							{
								data: values,
								backgroundColor: [
									'#94a3b8',
									'#fbbf24',
									'#34d399',
									'#f87171',
									'#c4b5fd',
									'#5eead4'
								]
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: { legend: { position: 'bottom' } }
					}
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
	{:else}
		<div class="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 xl:grid-cols-4">
			<div class="card-panel min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
						Facturado del mes
					</p>
					<span class="text-lg" aria-hidden="true">📄</span>
				</div>
				<p class="mt-2 break-all text-xl font-semibold sm:text-2xl">{formatMXN(data.totalFacturado)}</p>
				<p class="mt-1 text-[11px] text-[var(--color-muted)]">Solo cotizaciones marcadas FACTURADA</p>
			</div>
			<div class="card-panel min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
						Cobrado del mes
					</p>
					<span class="text-lg" aria-hidden="true">💵</span>
				</div>
				<p class="mt-2 break-all text-xl font-semibold sm:text-2xl">{formatMXN(data.totalCobrado)}</p>
			</div>
			<div class="card-panel min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
						Cartera pendiente
					</p>
					<span class="text-lg" aria-hidden="true">⏳</span>
				</div>
				<p class="mt-2 break-all text-xl font-semibold text-red-700 sm:text-2xl">
					{formatMXN(data.carteraPendiente)}
				</p>
				<p class="mt-1 text-[11px] text-[var(--color-muted)]">APROBADA / FACTURADA con saldo &gt; 0</p>
			</div>
			<div class="card-panel min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
						Cotizaciones activas
					</p>
					<span class="text-lg" aria-hidden="true">📋</span>
				</div>
				<p class="mt-2 text-xl font-semibold sm:text-2xl">{data.cotsActivas}</p>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-3 font-semibold">Ingresos cobrados (6 meses)</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64">
					<canvas class="max-w-full" bind:this={barsEl}></canvas>
				</div>
			</div>
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-3 font-semibold">Cotizaciones por estado</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64">
					<canvas class="max-w-full" bind:this={donutEl}></canvas>
				</div>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel p-0">
				<div class="border-b border-[var(--color-line)] px-4 py-3">
					<h2 class="font-semibold">Últimas cotizaciones</h2>
				</div>
				{#if data.ultimasCots.length === 0}
					<p class="p-4 text-sm text-[var(--color-muted)]">Aún no hay cotizaciones.</p>
				{:else}
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
								{#each data.ultimasCots as c}
									<tr>
										<td>
											<a
												class="font-medium text-[var(--color-brand-800)] hover:underline"
												href={`/cotizaciones/${c.id}`}>{c.numero}</a
											>
										</td>
										<td class="!whitespace-normal">{c.cliente}</td>
										<td>{formatFecha(c.fecha)}</td>
										<td>{formatMXN(c.total)}</td>
										<td><BadgeEstado estado={c.estado} /></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<div class="card-panel p-0">
				<div class="border-b border-[var(--color-line)] px-4 py-3">
					<h2 class="font-semibold">Top clientes con pendiente</h2>
				</div>
				{#if data.topClientes.length === 0}
					<p class="p-4 text-sm text-[var(--color-muted)]">Sin cartera pendiente.</p>
				{:else}
					<div class="table-wrap">
						<table class="data-table">
							<thead>
								<tr>
									<th>Cliente</th>
									<th>Saldo pendiente</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-line)]">
								{#each data.topClientes as c}
									<tr>
										<td>
											<a class="font-medium hover:underline" href={`/clientes/${c.clienteId}`}
												>{c.nombre}</a
											>
										</td>
										<td class="font-semibold text-red-700">{formatMXN(c.pendiente)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
