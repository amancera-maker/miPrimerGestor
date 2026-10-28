<script>
	import { formatMXN, formatFecha } from '$lib/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const c = $derived(data.cotizacion);
</script>

<div class="mx-auto min-h-dvh max-w-3xl px-4 py-8">
	<div class="mb-6">
		<p class="font-display text-3xl text-[var(--color-brand-900)]">GestorPyme</p>
		<p class="text-sm text-[var(--color-muted)]">Vista pública de cotización</p>
	</div>
	<div class="card-panel space-y-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-2xl font-semibold">{c.numero}</h1>
				<p class="text-sm text-[var(--color-muted)]">Para {c.clienteNombre}</p>
			</div>
			<div class="text-sm text-[var(--color-muted)]">
				<p>Emisión: {formatFecha(c.fecha)}</p>
				<p>Vence: {formatFecha(c.vencimiento)}</p>
			</div>
		</div>
		<div class="table-wrap">
			<table class="data-table">
				<thead>
					<tr><th>Concepto</th><th>Cant.</th><th>P. unit.</th><th>Importe</th></tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-line)]">
					{#each c.conceptos as row}
						<tr>
							<td class="!whitespace-normal">{row.descripcion}</td>
							<td>{row.cantidad}</td>
							<td>{formatMXN(row.precioUnitario)}</td>
							<td>{formatMXN(row.subtotal)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="space-y-1 text-sm">
			<div class="flex justify-between"><span>Subtotal</span><span>{formatMXN(c.subtotal)}</span></div>
			<div class="flex justify-between"><span>IVA 16%</span><span>{formatMXN(c.iva)}</span></div>
			<div class="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatMXN(c.total)}</span></div>
		</div>
		{#if c.notas}
			<p class="text-sm text-[var(--color-muted)]">{c.notas}</p>
		{/if}
	</div>
</div>
