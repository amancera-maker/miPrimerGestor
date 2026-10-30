<script>
	import { enhance } from '$app/forms';
	import { formatMXN, formatFecha, formatFechaHora, toInputDate } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { TRANSICIONES } from '$lib/client/estados.js';
	import { createFormToastGate } from '$lib/client/useFormToasts.svelte.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	const c = $derived(data.cotizacion);
	const saldo = $derived(c.saldo);
	const siguientes = $derived(
		(TRANSICIONES[c.estado] ?? []).filter((/** @type {string} */ e) => e !== 'PAGADA')
	);

	let showPago = $state(false);
	let showReabrir = $state(false);
	let confirmDelete = $state(false);
	/** @type {any | null} */
	let pagoAEliminar = $state(null);
	let editing = $state(false);
	let saving = $state(false);
	/** @type {string | null} */
	let estadoBusy = $state(null);
	let pagoIdem = $state(crypto.randomUUID());
	/** @type {any[]} */
	let toasts = $state([]);
	/** @type {{ descripcion: string, cantidad: string, precioUnitario: string }[]} */
	let conceptosEdit = $state([]);
	const toastGate = createFormToastGate();

	$effect(() => {
		conceptosEdit = c.conceptos.map((/** @type {any} */ x) => ({
			descripcion: x.descripcion,
			cantidad: String(x.cantidad),
			precioUnitario: String(x.precioUnitario)
		}));
	});

	$effect(() => {
		toastGate.consumeFlash(data.flash, (msg) => pushToast('info', msg));
		toastGate.consumeForm(form, {
			onSuccess: (f) => {
				showPago = false;
				showReabrir = false;
				confirmDelete = false;
				pagoAEliminar = null;
				editing = false;
				pagoIdem = crypto.randomUUID();
				const extra =
					f.saldoPendiente != null ? ` · Pendiente: ${formatMXN(f.saldoPendiente)}` : '';
				pushToast(f.warning ? 'info' : 'success', `${f.message || 'Listo'}${extra}`);
			},
			onError: (f) => pushToast('error', f.message || f.error || 'Error')
		});
	});

	const pendienteClass = $derived.by(() => {
		const p = Number(saldo.pendiente);
		const t = Number(saldo.total);
		if (!Number.isFinite(p) || p <= 0) return 'text-emerald-700';
		if (Number.isFinite(t) && t > 0 && p / t <= 0.35) return 'text-amber-600';
		return 'text-red-700';
	});

	/** @param {any} p */
	function pedirEliminarPago(p) {
		pagoAEliminar = p;
		confirmDelete = true;
	}

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
	const canPay = $derived(c.estado === 'APROBADA');
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
			{:else if c.estado === 'PAGADA'}
				<p class="text-xs text-[var(--color-muted)] max-w-[14rem] text-right">
					Cobrado al 100%. Ya puedes marcarla como FACTURADA.
				</p>
			{:else if c.estado === 'FACTURADA'}
				<p class="text-xs text-[var(--color-muted)] max-w-[14rem] text-right">
					Facturada y cobrada por completo.
				</p>
			{:else if !['RECHAZADA', 'BORRADOR'].includes(c.estado)}
				<p class="text-xs text-[var(--color-muted)] max-w-[14rem] text-right">
					Los pagos se registran cuando está APROBADA.
				</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="card-panel">
			<p class="text-xs uppercase text-[var(--color-muted)]">Total</p>
			<p class="mt-1 text-xl font-semibold">{formatMXN(saldo.total)}</p>
		</div>
		<div class="card-panel">
			<p class="text-xs uppercase text-[var(--color-muted)]">Pagado</p>
			<p class="mt-1 text-xl font-semibold">{formatMXN(saldo.pagado)}</p>
		</div>
		<div class="card-panel">
			<p class="text-xs uppercase text-[var(--color-muted)]">Pendiente</p>
			<p class={`mt-1 text-xl font-semibold ${pendienteClass}`}>{formatMXN(saldo.pendiente)}</p>
		</div>
	</div>

	{#if siguientes.length || c.estado === 'RECHAZADA' || c.estado === 'ENVIADA'}
		<div class="card-panel">
			<h2 class="mb-3 font-semibold">Acciones de estado</h2>
			<div class="flex flex-wrap gap-2">
				{#each siguientes as est}
					<form
						method="POST"
						action="?/cambiarEstado"
						use:enhance={({ cancel }) => {
							if (estadoBusy) {
								cancel();
								return;
							}
							estadoBusy = est;
							return async ({ update, result }) => {
								await update({ invalidateAll: true });
								estadoBusy = null;
								if (result.type === 'failure') {
									pushToast('error', 'No se pudo cambiar el estado.');
								}
							};
						}}
					>
						<input type="hidden" name="estado" value={est} />
						<button class="btn-primary" type="submit" disabled={estadoBusy !== null}>
							{#if estadoBusy === est && est === 'ENVIADA'}
								Enviando al cliente…
							{:else if estadoBusy === est}
								Actualizando…
							{:else if est === 'ENVIADA'}
								Enviar al cliente
							{:else if est === 'FACTURADA'}
								Marcar facturada
							{:else}
								Marcar {est.toLowerCase()}
							{/if}
						</button>
					</form>
				{/each}
				{#if c.estado === 'ENVIADA'}
					<form
						method="POST"
						action="?/reenviarCorreo"
						use:enhance={({ cancel }) => {
							if (estadoBusy) {
								cancel();
								return;
							}
							estadoBusy = 'reenviar';
							return async ({ update }) => {
								await update({ invalidateAll: true });
								estadoBusy = null;
							};
						}}
					>
						<button class="btn-secondary" type="submit" disabled={estadoBusy !== null}>
							{estadoBusy === 'reenviar' ? 'Reenviando…' : 'Reenviar correo'}
						</button>
					</form>
				{/if}
				{#if c.estado === 'RECHAZADA'}
					<button type="button" class="btn-primary" onclick={() => (showReabrir = true)}
						>Reabrir como borrador</button
					>
				{/if}
			</div>
			{#if c.estado === 'RECHAZADA'}
				<p class="mt-3 text-sm text-[var(--color-muted)]">
					Rechazada: usa <strong>Reabrir como borrador</strong> (con motivo) para volver a editarla y
					enviarla.
				</p>
			{:else}
				<p class="mt-3 text-xs text-[var(--color-muted)]">
					Orden: aprueba → registra pagos hasta PAGADA (automático) → luego puedes marcar FACTURADA.
					No se factura con saldo pendiente.
				</p>
			{/if}
		</div>
	{:else if c.estado === 'RECHAZADA'}
		<div class="card-panel">
			<h2 class="mb-3 font-semibold">Cotización rechazada</h2>
			<button type="button" class="btn-primary" onclick={() => (showReabrir = true)}
				>Reabrir como borrador</button
			>
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
			<div class="mb-3 flex items-center justify-between gap-2">
				<h2 class="font-semibold">Historial de pagos</h2>
				{#if canPay}
					<button type="button" class="btn-secondary" onclick={() => (showPago = true)}>Registrar pago</button>
				{/if}
			</div>
			{#if c.pagos.length === 0}
				<p class="text-sm text-[var(--color-muted)]">Sin pagos registrados.</p>
			{:else}
				<ul class="divide-y divide-[var(--color-line)] text-sm">
					{#each c.pagos as p}
						<li class="flex items-center justify-between gap-2 py-3">
							<div>
								<p class="font-medium">{formatFecha(p.fecha)} · {formatMXN(p.monto)}</p>
								<p class="text-[var(--color-muted)]">
									{p.metodo}{p.referencia ? ` · Ref: ${p.referencia}` : ''}
								</p>
							</div>
							{#if c.estado !== 'PAGADA'}
								<button
									type="button"
									class="btn-ghost text-[var(--color-danger)]"
									onclick={() => pedirEliminarPago(p)}>Eliminar</button
								>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<div class="mt-4 space-y-1 border-t border-[var(--color-line)] pt-3 text-sm">
				<div class="flex justify-between"><span>Total</span><span>{formatMXN(saldo.total)}</span></div>
				<div class="flex justify-between"><span>Pagado</span><span>{formatMXN(saldo.pagado)}</span></div>
				<div class={`flex justify-between font-semibold ${pendienteClass}`}>
					<span>Pendiente</span><span>{formatMXN(saldo.pendiente)}</span>
				</div>
			</div>
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

{#if showPago}
	<Modal open={showPago} title="Registrar pago" onclose={() => (showPago = false)}>
		<form
			method="POST"
			action="?/registrarPago"
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
			<p class="text-sm text-[var(--color-muted)]">
				Saldo pendiente: <strong class={pendienteClass}>{formatMXN(saldo.pendiente)}</strong>
			</p>
			<div>
				<label class="label" for="monto">Monto (MXN) *</label>
				<input
					class="input"
					id="monto"
					name="monto"
					type="number"
					step="0.01"
					min="0.01"
					required
					inputmode="decimal"
					value={form?.pagoValues?.monto ?? saldo.pendiente}
				/>
				{#if fieldErrors.monto}<p class="field-error">{fieldErrors.monto}</p>{/if}
			</div>
			<div>
				<label class="label" for="fechaPago">Fecha *</label>
				<input
					class="input"
					id="fechaPago"
					name="fecha"
					type="date"
					required
					min={toInputDate(c.fecha)}
					value={toInputDate(new Date())}
				/>
				{#if fieldErrors.fecha}<p class="field-error">{fieldErrors.fecha}</p>{/if}
				<p class="mt-1 text-xs text-[var(--color-muted)]">No puede ser anterior a la emisión.</p>
			</div>
			<div>
				<label class="label" for="metodo">Método *</label>
				<select class="input" id="metodo" name="metodo" required>
					{#each ['TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA'] as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="label" for="referencia">Referencia</label>
				<input class="input" id="referencia" name="referencia" />
			</div>
			{#if fieldErrors._form}<p class="field-error">{fieldErrors._form}</p>{/if}
			<button class="btn-primary w-full" disabled={saving} type="submit">
				{saving ? 'Guardando…' : 'Registrar pago'}
			</button>
		</form>
	</Modal>
{/if}

{#if confirmDelete && pagoAEliminar}
	<Modal
		open={confirmDelete}
		title="Eliminar pago"
		onclose={() => {
			confirmDelete = false;
			pagoAEliminar = null;
		}}
	>
		<p class="text-sm text-[var(--color-muted)]">
			¿Eliminar el pago de <strong>{formatMXN(pagoAEliminar.monto)}</strong> del
			{formatFecha(pagoAEliminar.fecha)}? Esta acción no se puede deshacer.
		</p>
		<form method="POST" action="?/eliminarPago" class="mt-4" use:enhance>
			<input type="hidden" name="pagoId" value={pagoAEliminar.id} />
			<button class="btn-danger w-full" type="submit">Confirmar eliminación</button>
		</form>
	</Modal>
{/if}

<Modal open={showReabrir} title="Reabrir como borrador" onclose={() => (showReabrir = false)}>
	<form method="POST" action="?/reabrir" class="space-y-3" use:enhance>
		<p class="text-sm text-[var(--color-muted)]">Se registrará en auditoría. Indica el motivo.</p>
		<textarea class="input min-h-24" name="motivo" required placeholder="Motivo de reapertura"></textarea>
		<button class="btn-primary w-full" type="submit">Confirmar reapertura</button>
	</form>
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
