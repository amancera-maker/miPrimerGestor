<script>
	import { enhance } from '$app/forms';
	import { formatMXN, formatFecha, formatFechaHora, toInputDate } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { TRANSICIONES } from '$lib/client/estados.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	const c = $derived(data.cotizacion);
	const saldo = $derived(c.saldo);
	const siguientes = $derived(TRANSICIONES[c.estado] ?? []);

	let showPago = $state(false);
	let showReabrir = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let pagoIdem = $state(crypto.randomUUID());
	/** @type {any[]} */
	let toasts = $state([]);
	/** @type {{ descripcion: string, cantidad: string, precioUnitario: string }[]} */
	let conceptosEdit = $state([]);

	$effect(() => {
		conceptosEdit = c.conceptos.map((/** @type {any} */ x) => ({
			descripcion: x.descripcion,
			cantidad: String(x.cantidad),
			precioUnitario: String(x.precioUnitario)
		}));
	});

	$effect(() => {
		if (form?.success) {
			showPago = false;
			showReabrir = false;
			editing = false;
			pagoIdem = crypto.randomUUID();
			pushToast(form.warning ? 'info' : 'success', form.message);
		}
		if (form?.message && !form.success && !form.fieldErrors) pushToast('error', form.message);
		if (data.flash) pushToast('info', data.flash);
	});

	/**
	 * @param {'success'|'error'|'info'} type
	 * @param {string} message
	 */
	function pushToast(type, message) {
		const id = Date.now() + Math.random();
		toasts = [...toasts, { id, type, message }];
		setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 4500);
	}

	const fieldErrors = $derived(form?.fieldErrors ?? {});
	const canPay = $derived(['APROBADA', 'FACTURADA'].includes(c.estado));
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<a href="/cotizaciones" class="text-sm text-[var(--color-brand-800)] hover:underline">← Cotizaciones</a>
			<div class="mt-1 flex flex-wrap items-center gap-3">
				<h1 class="font-display text-3xl text-[var(--color-brand-900)]">{c.numero}</h1>
				<BadgeEstado estado={c.estado} />
			</div>
			<p class="text-sm text-[var(--color-muted)]">
				<a class="hover:underline" href={`/clientes/${c.clienteId}`}>{c.cliente.nombre}</a>
				· {formatFecha(c.fecha)} · vence {formatFecha(c.vencimiento)}
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a class="btn-secondary" href={`/cotizaciones/${c.id}/pdf`} target="_blank" rel="noopener">Ver PDF</a>
			{#if c.estado === 'BORRADOR'}
				<button type="button" class="btn-secondary" onclick={() => (editing = !editing)}
					>{editing ? 'Cancelar edición' : 'Editar'}</button
				>
			{/if}
			{#if canPay}
				<button type="button" class="btn-primary" onclick={() => (showPago = true)}>Registrar pago</button>
			{/if}
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="card-panel"><p class="text-xs uppercase text-[var(--color-muted)]">Total</p><p class="mt-1 text-xl font-semibold">{formatMXN(saldo.total)}</p></div>
		<div class="card-panel"><p class="text-xs uppercase text-[var(--color-muted)]">Pagado</p><p class="mt-1 text-xl font-semibold">{formatMXN(saldo.pagado)}</p></div>
		<div class="card-panel"><p class="text-xs uppercase text-[var(--color-muted)]">Pendiente</p><p class="mt-1 text-xl font-semibold">{formatMXN(saldo.pendiente)}</p></div>
	</div>

	{#if siguientes.length || c.estado === 'RECHAZADA' || c.estado === 'ENVIADA'}
		<div class="card-panel">
			<h2 class="mb-3 font-semibold">Acciones de estado</h2>
			<div class="flex flex-wrap gap-2">
				{#each siguientes as est}
					<form method="POST" action="?/estado" use:enhance>
						<input type="hidden" name="estado" value={est} />
						<button class="btn-primary" type="submit">Marcar {est.toLowerCase()}</button>
					</form>
				{/each}
				{#if c.estado === 'ENVIADA'}
					<form method="POST" action="?/reenviarCorreo" use:enhance>
						<button class="btn-secondary" type="submit">Reenviar correo</button>
					</form>
				{/if}
				{#if c.estado === 'RECHAZADA'}
					<button type="button" class="btn-secondary" onclick={() => (showReabrir = true)}>Reabrir como borrador</button>
				{/if}
			</div>
			<p class="mt-3 text-xs text-[var(--color-muted)]">
				PAGADA se asigna automáticamente cuando los pagos cubren el total. No hay botón manual.
			</p>
		</div>
	{/if}

	{#if editing && c.estado === 'BORRADOR'}
		<form
			method="POST"
			action="?/update"
			class="card-panel space-y-3"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
					saving = false;
				};
			}}
		>
			<input type="hidden" name="clienteId" value={c.clienteId} />
			<div class="grid gap-3 sm:grid-cols-2">
				<div>
					<label class="label" for="fecha">Emisión</label>
					<input class="input" id="fecha" name="fecha" type="date" value={toInputDate(c.fecha)} required />
				</div>
				<div>
					<label class="label" for="vencimiento">Vencimiento</label>
					<input class="input" id="vencimiento" name="vencimiento" type="date" value={toInputDate(c.vencimiento)} required />
				</div>
			</div>
			{#each conceptosEdit as row, i}
				<div class="grid gap-2 sm:grid-cols-[1fr_5rem_8rem]">
					<input class="input" name="concepto_descripcion" bind:value={row.descripcion} required />
					<input class="input" name="concepto_cantidad" type="number" min="1" step="1" bind:value={row.cantidad} required />
					<input class="input" name="concepto_precio" bind:value={row.precioUnitario} required />
				</div>
			{/each}
			<textarea class="input min-h-20" name="notas">{c.notas ?? ''}</textarea>
			<button class="btn-primary" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
		</form>
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr><th>Descripción</th><th>Cant.</th><th>P. unitario</th><th>Importe</th></tr>
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
			<div class="space-y-1 border-t border-[var(--color-line)] px-4 py-4 text-sm">
				<div class="flex justify-between"><span>Subtotal</span><span>{formatMXN(c.subtotal)}</span></div>
				<div class="flex justify-between"><span>IVA 16%</span><span>{formatMXN(c.iva)}</span></div>
				<div class="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMXN(c.total)}</span></div>
			</div>
		</div>
	{/if}

	<section class="grid gap-4 lg:grid-cols-2">
		<div class="card-panel">
			<h2 class="mb-3 font-semibold">Pagos</h2>
			{#if c.pagos.length === 0}
				<p class="text-sm text-[var(--color-muted)]">Sin pagos registrados.</p>
			{:else}
				<ul class="divide-y divide-[var(--color-line)] text-sm">
					{#each c.pagos as p}
						<li class="flex items-center justify-between gap-2 py-3">
							<div>
								<p class="font-medium">{formatMXN(p.monto)} · {p.metodo}</p>
								<p class="text-[var(--color-muted)]">{formatFecha(p.fecha)}{p.referencia ? ` · ${p.referencia}` : ''}</p>
							</div>
							{#if c.estado !== 'PAGADA'}
								<form
									method="POST"
									action="?/eliminarPago"
									use:enhance={() => {
										if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) {
											return async () => {};
										}
										return async ({ update }) => update();
									}}
								>
									<input type="hidden" name="pagoId" value={p.id} />
									<button class="btn-ghost text-[var(--color-danger)]" type="submit">Eliminar</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<div class="card-panel">
			<h2 class="mb-3 font-semibold">Historial</h2>
			<ul class="space-y-3 text-sm">
				{#each c.historial as h}
					<li class="border-l-2 border-[var(--color-brand-700)] pl-3">
						<p class="font-medium">
							{#if h.estadoAnterior && h.estadoAnterior !== h.estadoNuevo}
								{h.estadoAnterior} → {h.estadoNuevo}
							{:else}
								{h.nota || h.estadoNuevo}
							{/if}
						</p>
						<p class="text-[var(--color-muted)]">
							{formatFechaHora(h.creadoEn)}{h.usuarioNombre ? ` · ${h.usuarioNombre}` : ''}
						</p>
						{#if h.nota && h.estadoAnterior !== h.estadoNuevo}
							<p class="text-[var(--color-muted)]">{h.nota}</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</section>
</div>

<Modal open={showPago} title="Registrar pago" onclose={() => (showPago = false)}>
	<form
		method="POST"
		action="?/pago"
		class="space-y-3"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<input type="hidden" name="idempotencyKey" value={pagoIdem} />
		<p class="text-sm text-[var(--color-muted)]">Saldo pendiente: <strong>{formatMXN(saldo.pendiente)}</strong></p>
		<div>
			<label class="label" for="monto">Monto *</label>
			<input class="input" id="monto" name="monto" required inputmode="decimal" value={form?.pagoValues?.monto ?? saldo.pendiente} />
			{#if fieldErrors.monto}<p class="field-error">{fieldErrors.monto}</p>{/if}
		</div>
		<div>
			<label class="label" for="fechaPago">Fecha *</label>
			<input class="input" id="fechaPago" name="fecha" type="date" required value={toInputDate(new Date())} />
			{#if fieldErrors.fecha}<p class="field-error">{fieldErrors.fecha}</p>{/if}
		</div>
		<div>
			<label class="label" for="metodo">Método *</label>
			<select class="input" id="metodo" name="metodo" required>
				{#each ['TRANSFERENCIA','EFECTIVO','CHEQUE','TARJETA'] as m}
					<option value={m}>{m}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label" for="referencia">Referencia</label>
			<input class="input" id="referencia" name="referencia" />
		</div>
		{#if fieldErrors._form}<p class="field-error">{fieldErrors._form}</p>{/if}
		<button class="btn-primary w-full" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Registrar pago'}</button>
	</form>
</Modal>

<Modal open={showReabrir} title="Reabrir como borrador" onclose={() => (showReabrir = false)}>
	<form method="POST" action="?/reabrir" class="space-y-3" use:enhance>
		<p class="text-sm text-[var(--color-muted)]">Se registrará en auditoría. Indica el motivo.</p>
		<textarea class="input min-h-24" name="motivo" required placeholder="Motivo de reapertura"></textarea>
		<button class="btn-primary w-full" type="submit">Confirmar reapertura</button>
	</form>
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
