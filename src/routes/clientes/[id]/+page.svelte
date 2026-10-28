<script>
	import { enhance } from '$app/forms';
	import { formatMXN, formatFecha } from '$lib/format.js';
	import BadgeEstado from '$lib/components/BadgeEstado.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let editing = $state(false);
	let confirmDeactivate = $state(false);
	let saving = $state(false);
	/** @type {any[]} */
	let toasts = $state([]);

	$effect(() => {
		if (form?.success) {
			editing = false;
			confirmDeactivate = false;
			pushToast('success', form.message);
		}
		if (form?.message && !form.success && !form.fieldErrors) pushToast('error', form.message);
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

	const c = $derived(data.cliente);
	const fieldErrors = $derived(form?.fieldErrors ?? {});
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<a href="/clientes" class="text-sm text-[var(--color-brand-800)] hover:underline">← Clientes</a>
			<h1 class="font-display mt-1 text-3xl text-[var(--color-brand-900)]">{c.nombre}</h1>
			<p class="text-sm text-[var(--color-muted)]">{c.empresa || 'Sin empresa'} · {c.activo ? 'Activo' : 'Inactivo'}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn-secondary" onclick={() => (editing = true)}>Editar</button>
			{#if c.activo}
				<button type="button" class="btn-secondary" onclick={() => (confirmDeactivate = true)}>Desactivar</button>
				<a class="btn-primary" href={`/cotizaciones/nueva?clienteId=${c.id}`}>Nueva cotización</a>
			{:else}
				<form method="POST" action="?/reactivate" use:enhance>
					<button class="btn-primary" type="submit">Reactivar</button>
				</form>
			{/if}
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-3">
		<div class="card-panel"><p class="text-xs text-[var(--color-muted)] uppercase">Facturado</p><p class="mt-1 text-xl font-semibold">{formatMXN(data.totales.facturado)}</p></div>
		<div class="card-panel"><p class="text-xs text-[var(--color-muted)] uppercase">Cobrado</p><p class="mt-1 text-xl font-semibold">{formatMXN(data.totales.cobrado)}</p></div>
		<div class="card-panel"><p class="text-xs text-[var(--color-muted)] uppercase">Saldo pendiente</p><p class="mt-1 text-xl font-semibold">{formatMXN(data.totales.pendiente)}</p></div>
	</div>

	<div class="card-panel grid gap-3 sm:grid-cols-2">
		<div><p class="text-xs text-[var(--color-muted)]">RFC</p><p>{c.rfc || '—'}</p></div>
		<div><p class="text-xs text-[var(--color-muted)]">Correo</p><p>{c.correo}</p></div>
		<div><p class="text-xs text-[var(--color-muted)]">Teléfono</p><p>{c.telefono || '—'}</p></div>
		<div><p class="text-xs text-[var(--color-muted)]">Dirección</p><p>{c.direccion || '—'}</p></div>
		{#if c.notas}<div class="sm:col-span-2"><p class="text-xs text-[var(--color-muted)]">Notas</p><p>{c.notas}</p></div>{/if}
	</div>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold">Cotizaciones</h2>
		{#if c.cotizaciones.length === 0}
			<EmptyState
				title="Sin cotizaciones"
				description="Crea la primera cotización para este cliente."
				actionHref={c.activo ? `/cotizaciones/nueva?clienteId=${c.id}` : '/cotizaciones'}
				actionLabel={c.activo ? 'Crear cotización' : 'Ver cotizaciones'}
			/>
		{:else}
			<div class="card-panel p-0">
				<div class="table-wrap">
					<table class="data-table">
						<thead>
							<tr><th>Número</th><th>Fecha</th><th>Total</th><th>Estado</th></tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-line)]">
							{#each c.cotizaciones as cot}
								<tr>
									<td><a class="font-medium text-[var(--color-brand-800)] hover:underline" href={`/cotizaciones/${cot.id}`}>{cot.numero}</a></td>
									<td>{formatFecha(cot.fecha)}</td>
									<td>{formatMXN(cot.totalFmt)}</td>
									<td><BadgeEstado estado={cot.estado} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
</div>

<Modal open={editing} title="Editar cliente" onclose={() => (editing = false)}>
	<form
		method="POST"
		action="?/update"
		class="space-y-3"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<div>
			<label class="label" for="nombre">Nombre *</label>
			<input class="input" id="nombre" name="nombre" required value={c.nombre} />
			{#if fieldErrors.nombre}<p class="field-error">{fieldErrors.nombre}</p>{/if}
		</div>
		<div>
			<label class="label" for="empresa">Empresa</label>
			<input class="input" id="empresa" name="empresa" value={c.empresa ?? ''} />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="rfc">RFC</label>
				<input class="input" id="rfc" name="rfc" value={c.rfc ?? ''} />
				{#if fieldErrors.rfc}<p class="field-error">{fieldErrors.rfc}</p>{/if}
			</div>
			<div>
				<label class="label" for="telefono">Teléfono</label>
				<input class="input" id="telefono" name="telefono" value={c.telefono ?? ''} />
				{#if fieldErrors.telefono}<p class="field-error">{fieldErrors.telefono}</p>{/if}
			</div>
		</div>
		<div>
			<label class="label" for="correo">Correo *</label>
			<input class="input" id="correo" name="correo" type="email" required value={c.correo} />
			{#if fieldErrors.correo}<p class="field-error">{fieldErrors.correo}</p>{/if}
		</div>
		<div>
			<label class="label" for="direccion">Dirección</label>
			<input class="input" id="direccion" name="direccion" value={c.direccion ?? ''} />
		</div>
		<div>
			<label class="label" for="notas">Notas</label>
			<textarea class="input min-h-24" id="notas" name="notas">{c.notas ?? ''}</textarea>
		</div>
		<button class="btn-primary w-full" disabled={saving} type="submit">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
	</form>
</Modal>

<Modal open={confirmDeactivate} title="Desactivar cliente" onclose={() => (confirmDeactivate = false)}>
	<p class="text-sm text-[var(--color-muted)]">
		El cliente dejará de aparecer en listados activos y no se podrán crear cotizaciones nuevas. El historial se conserva.
	</p>
	<form method="POST" action="?/deactivate" class="mt-4" use:enhance>
		<button class="btn-danger w-full" type="submit">Confirmar desactivación</button>
	</form>
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
