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
								backgroundColor: '#176b52',
								hoverBackgroundColor: '#1f8a68',
								borderRadius: 8,
								maxBarThickness: 36
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
									'#f59e0b',
									'#10b981',
									'#ef4444',
									'#0e7490',
									'#14b8a6'
								],
								borderWidth: 2,
								borderColor: '#ffffff'
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
	<header class="page-header">
		<h1>Dashboard</h1>
		<p>Indicadores financieros del despacho</p>
	</header>

	{#if data.error}
		<div class="rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-sm">
			{data.error}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-3.5 min-[380px]:grid-cols-2 xl:grid-cols-4">
			<div class="kpi-card kpi-card--cobrado min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="kpi-label">Cobrado del mes</p>
					<span class="kpi-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
							><path
								d="M12 3v18M7 8.5c0-1.7 2.2-3 5-3s5 1.3 5 3-2.2 3-5 3-5 1.3-5 3 2.2 3 5 3 5-1.3 5-3"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
							/></svg
						>
					</span>
				</div>
				<p class="kpi-value">{formatMXN(data.totalCobrado)}</p>
				<p class="kpi-hint">Suma de pagos registrados este mes</p>
			</div>
			<div class="kpi-card kpi-card--pendiente min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="kpi-label">Pendiente de aprobar</p>
					<span class="kpi-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
							><circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.8" /><path
								d="M12 7.5V12l3 2"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
							/></svg
						>
					</span>
				</div>
				<p class="kpi-value text-[var(--color-danger)]">{formatMXN(data.pendienteAprobar)}</p>
				<p class="kpi-hint">Monto en borrador o enviadas (aún no aprobadas)</p>
			</div>
			<div class="kpi-card kpi-card--activas min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="kpi-label">Cotizaciones activas</p>
					<span class="kpi-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
							><path
								d="M8 6h11M8 12h11M8 18h7M5 6h.01M5 12h.01M5 18h.01"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
							/></svg
						>
					</span>
				</div>
				<p class="kpi-value">{data.cotsActivas}</p>
				<p class="kpi-hint">Enviadas, aprobadas o pagadas (sin facturar)</p>
			</div>
			<div class="kpi-card kpi-card--facturado min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="kpi-label">Cotizado del mes</p>
					<span class="kpi-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
							><path
								d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
								stroke="currentColor"
								stroke-width="1.8"
							/><path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg
						>
					</span>
				</div>
				<p class="kpi-value">{formatMXN(data.cotizadoMes)}</p>
				<p class="kpi-hint">Total emitido este mes (sin rechazadas)</p>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-4 text-[0.95rem] font-bold tracking-tight text-[var(--color-brand-900)]">
					Ingresos cobrados (6 meses)
				</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64">
					<canvas class="max-w-full" bind:this={barsEl}></canvas>
				</div>
			</div>
			<div class="card-panel min-w-0 overflow-hidden">
				<h2 class="mb-4 text-[0.95rem] font-bold tracking-tight text-[var(--color-brand-900)]">
					Cotizaciones por estado
				</h2>
				<div class="relative h-56 w-full max-w-full sm:h-64">
					<canvas class="max-w-full" bind:this={donutEl}></canvas>
				</div>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<div class="card-panel overflow-hidden p-0">
				<div class="panel-title-bar">
					<h2>Últimas cotizaciones</h2>
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
							<tbody>
								{#each data.ultimasCots as c}
									<tr>
										<td>
											<a
												class="font-semibold text-[var(--color-brand-800)] hover:underline"
												href={`/cotizaciones/${c.id}`}>{c.numero}</a
											>
										</td>
										<td class="!whitespace-normal">{c.cliente}</td>
										<td>{formatFecha(c.fecha)}</td>
										<td class="font-medium">{formatMXN(c.total)}</td>
										<td><BadgeEstado estado={c.estado} /></td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<div class="card-panel overflow-hidden p-0">
				<div class="panel-title-bar">
					<h2>Top clientes con pendiente</h2>
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
							<tbody>
								{#each data.topClientes as c}
									<tr>
										<td>
											<a class="font-semibold hover:underline" href={`/clientes/${c.clienteId}`}
												>{c.nombre}</a
											>
										</td>
										<td class="font-bold text-[var(--color-danger)]">{formatMXN(c.pendiente)}</td>
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
