<script>
	import { formatMXN } from '$lib/format.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	$effect(() => {
		if (form?.csv && form?.filename) {
			const blob = new Blob([form.csv], { type: 'text/csv;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = form.filename;
			a.click();
			URL.revokeObjectURL(url);
		}
	});

	const meses = [
		'Enero','Febrero','Marzo','Abril','Mayo','Junio',
		'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
	];
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<header class="page-header">
			<h1>Reportes</h1>
			<p>Resumen mensual por cliente</p>
		</header>
		<form method="POST" action="?/csv" class="flex gap-2">
			<input type="hidden" name="anio" value={data.anio} />
			<input type="hidden" name="mes" value={data.mes} />
			<button class="btn-secondary" type="submit">Exportar CSV</button>
		</form>
	</div>

	<form method="GET" class="card-panel flex flex-wrap gap-3">
		<div>
			<label class="label" for="mes">Mes</label>
			<select class="input" id="mes" name="mes" value={data.mes}>
				{#each meses as nombre, i}
					<option value={i + 1}>{nombre}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label" for="anio">Año</label>
			<input class="input" id="anio" name="anio" type="number" min="2020" max="2100" value={data.anio} />
		</div>
		<div class="flex items-end">
			<button class="btn-primary" type="submit">Consultar</button>
		</div>
	</form>

	<div class="card-panel">
		<p class="text-sm text-[var(--color-muted)]">Total del período</p>
		<p class="text-2xl font-semibold">{formatMXN(data.reporte.granTotal)}</p>
	</div>

	<div class="card-panel p-0">
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr>
						<th>Cliente</th>
						<th># Cotizaciones</th>
						<th>Total</th>
						<th>Cobrado</th>
						<th>Pendiente</th>
						<th>%</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-line)]">
					{#each data.reporte.items as r}
						<tr>
							<td class="!whitespace-normal">
								<a class="font-medium text-[var(--color-brand-800)] hover:underline" href={`/clientes/${r.clienteId}`}
									>{r.nombre}</a
								>
							</td>
							<td>{r.cantidad}</td>
							<td>{formatMXN(r.total)}</td>
							<td>{formatMXN(r.cobrado)}</td>
							<td>{formatMXN(r.pendiente)}</td>
							<td>{r.porcentaje}%</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="py-8 text-center text-[var(--color-muted)]">Sin datos en este período</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
