<script>
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
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
			invalidate('app:cobranza');
		}
		if ((form?.message || form?.error) && !form.success) {
			pushToast('error', form.message || form.error);
		}
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
	 * @param {number} dias
	 */
	function rowClass(dias) {
		if (dias > 30) return 'bg-red-50';
		if (dias > 15) return 'bg-yellow-50';
		return '';
	}

	/**
	 * @param {number} dias
	 */
	function diasClass(dias) {
		if (dias > 30) return 'font-semibold text-red-700';
		if (dias > 15) return 'font-semibold text-amber-700';
		return '';
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<header class="page-header">
			<h1>Cobranza</h1>
			<p>Cotizaciones APROBADAS o FACTURADAS con saldo pendiente</p>
		</header>
		<div class="kpi-card kpi-card--pendiente min-w-[14rem] py-3">
			<p class="kpi-label">Cartera pendiente total</p>
			<p class="kpi-value text-[var(--color-danger)]">{formatMXN(data.cartera.carteraPendiente)}</p>
		</div>
	</div>

	{#if data.cartera.items.length === 0}
		<EmptyState
			title="Sin pendientes de cobro"
			description="Aquí solo aparecen cotizaciones APROBADAS o FACTURADAS con saldo pendiente. Si ya están PAGADAS o aún están en borrador/enviada, no salen en cobranza."
		/>
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Cliente</th>
							<th>Número</th>
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
							<tr class={rowClass(item.dias)}>
								<td class="!whitespace-normal font-medium">{item.clienteNombre}</td>
								<td>
									<a class="text-[var(--color-brand-800)] hover:underline" href={`/cotizaciones/${item.id}`}
										>{item.numero}</a
									>
								</td>
								<td>{formatFecha(item.fecha)}</td>
								<td>{formatMXN(item.total)}</td>
								<td>{formatMXN(item.pagado)}</td>
								<td class="font-semibold text-red-700">{formatMXN(item.pendiente)}</td>
								<td>
									<span class={diasClass(item.dias)}>{item.dias}</span>
								</td>
								<td>
									<button type="button" class="btn-secondary" onclick={() => (preview = item)}
										>Enviar recordatorio</button
									>
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
			<p>
				Se enviará un correo a <strong>{preview.clienteNombre}</strong> por la cotización
				<strong>{preview.numero}</strong>.
			</p>
			<p>Monto pendiente: <strong>{formatMXN(preview.pendiente)}</strong></p>
			<p class="rounded-lg bg-[var(--color-brand-50)] p-3 text-[var(--color-muted)]">
				Máximo un recordatorio por día al mismo cliente.
			</p>
			<form
				method="POST"
				action="?/enviarRecordatorio"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update({ invalidateAll: true });
						if (result.type === 'success') preview = null;
					};
				}}
			>
				<input type="hidden" name="cotizacionId" value={preview.id} />
				<button class="btn-primary w-full" type="submit">Confirmar envío</button>
			</form>
			<p class="text-xs text-[var(--color-muted)]">
				Con <code>onboarding@resend.dev</code> el correo de demo llega a tu cuenta (no al email
				ficticio del cliente).
			</p>
		</div>
	{/if}
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
