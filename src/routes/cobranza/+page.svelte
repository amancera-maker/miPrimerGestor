<script>
	import { enhance } from '$app/forms';
	import { formatMXN, formatFecha } from '$lib/format.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	/** @type {any | null} */
	let preview = $state(null);
	/** @type {any[]} */
	let toasts = $state([]);

	$effect(() => {
		if (form?.success) {
			preview = null;
			pushToast('success', form.message);
		}
		if (form?.message && !form.success) pushToast('error', form.message);
	});

	/**
	 * @param {'success'|'error'|'info'} type
	 * @param {string} message
	 */
	function pushToast(type, message) {
		const id = Date.now();
		toasts = [...toasts, { id, type, message }];
		setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 4000);
	}

	/**
	 * @param {string} alerta
	 */
	function rowClass(alerta) {
		if (alerta === 'roja') return 'bg-red-50';
		if (alerta === 'amarilla') return 'bg-amber-50';
		return '';
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="font-display text-3xl text-[var(--color-brand-900)]">Cobranza</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">
				Cotizaciones aprobadas o facturadas con saldo pendiente
			</p>
		</div>
		<div class="card-panel py-3">
			<p class="text-xs uppercase text-[var(--color-muted)]">Cartera pendiente</p>
			<p class="text-2xl font-semibold">{formatMXN(data.cartera.carteraPendiente)}</p>
		</div>
	</div>

	{#if data.cartera.items.length === 0}
		<EmptyState title="Sin pendientes de cobro" description="Cuando haya saldos abiertos aparecerán aquí." />
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Cliente</th>
							<th>Cotización</th>
							<th>Fecha</th>
							<th>Total</th>
							<th>Pagado</th>
							<th>Pendiente</th>
							<th>Días</th>
							<th></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each data.cartera.items as item}
							<tr class={rowClass(item.alerta)}>
								<td class="!whitespace-normal font-medium">{item.clienteNombre}</td>
								<td>
									<a class="text-[var(--color-brand-800)] hover:underline" href={`/cotizaciones/${item.id}`}
										>{item.numero}</a
									>
								</td>
								<td>{formatFecha(item.fecha)}</td>
								<td>{formatMXN(item.total)}</td>
								<td>{formatMXN(item.pagado)}</td>
								<td class="font-semibold">{formatMXN(item.pendiente)}</td>
								<td>
									<span
										class={item.alerta === 'roja'
											? 'font-semibold text-[var(--color-danger)]'
											: item.alerta === 'amarilla'
												? 'font-semibold text-[var(--color-warn)]'
												: ''}
									>
										{item.dias}
									</span>
								</td>
								<td>
									<button type="button" class="btn-secondary" onclick={() => (preview = item)}>Recordatorio</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<Modal open={Boolean(preview)} title="Enviar recordatorio" onclose={() => (preview = null)}>
	{#if preview}
		<div class="space-y-3 text-sm">
			<p>Se enviará un correo a <strong>{preview.clienteNombre}</strong> por la cotización <strong>{preview.numero}</strong>.</p>
			<p>Monto pendiente: <strong>{formatMXN(preview.pendiente)}</strong></p>
			<p class="rounded-lg bg-[var(--color-brand-50)] p-3 text-[var(--color-muted)]">
				Máximo un recordatorio por día al mismo cliente.
			</p>
			<form method="POST" action="?/recordatorio" use:enhance>
				<input type="hidden" name="cotizacionId" value={preview.id} />
				<button class="btn-primary w-full" type="submit">Confirmar envío</button>
			</form>
		</div>
	{/if}
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
