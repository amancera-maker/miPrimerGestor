<script>
	import { enhance } from '$app/forms';
	import { formatFecha } from '$lib/format.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let showCreate = $state(false);
	let saving = $state(false);
	let idem = $state(crypto.randomUUID());
	/** @type {{ id: number, type: 'success'|'error'|'info', message: string }[]} */
	let toasts = $state([]);

	/** @type {Record<string, string>} */
	let values = $state({});

	$effect(() => {
		if (form?.values) values = { ...form.values };
		if (form?.success) {
			showCreate = false;
			saving = false;
			idem = crypto.randomUUID();
			pushToast('success', form.message || 'Cliente registrado exitosamente');
		}
		if (form?.message && !form?.success && !form?.fieldErrors) {
			pushToast('error', form.message);
		}
	});

	/**
	 * @param {'success'|'error'|'info'} type
	 * @param {string} message
	 */
	function pushToast(type, message) {
		const id = Date.now();
		toasts = [...toasts, { id, type, message }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 4000);
	}

	const fieldErrors = $derived(form?.fieldErrors ?? {});
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="font-display text-3xl text-[var(--color-brand-900)]">Clientes</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">{data.list.total} registros</p>
		</div>
		<button type="button" class="btn-primary" onclick={() => (showCreate = true)}>Registrar cliente</button>
	</div>

	<form method="GET" class="card-panel grid gap-3 sm:grid-cols-[1fr_auto_auto]">
		<input class="input" type="search" name="q" value={data.list.q} placeholder="Buscar nombre, empresa o RFC" />
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="inactivos" value="1" checked={data.list.inactivos} />
			Mostrar inactivos
		</label>
		<button class="btn-secondary" type="submit">Buscar</button>
	</form>

	{#if data.list.items.length === 0}
		<EmptyState
			title="No hay clientes"
			description="Registra el primero para empezar a cotizar."
			actionLabel="Registrar cliente"
			actionHref="#"
		/>
		<button type="button" class="sr-only" onclick={() => (showCreate = true)}>Abrir</button>
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Empresa</th>
							<th>RFC</th>
							<th>Teléfono</th>
							<th>Correo</th>
							<th>Alta</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each data.list.items as c}
							<tr class="hover:bg-[var(--color-brand-50)]/60">
								<td>
									<a class="font-medium text-[var(--color-brand-800)] hover:underline" href={`/clientes/${c.id}`}
										>{c.nombre}</a
									>
								</td>
								<td>{c.empresa || '—'}</td>
								<td>{c.rfc || '—'}</td>
								<td>{c.telefono || '—'}</td>
								<td class="max-w-[12rem] truncate">{c.correo}</td>
								<td>{formatFecha(c.creadoEn)}</td>
								<td>
									<span class={c.activo ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-slate-200 text-slate-700'}>
										{c.activo ? 'Activo' : 'Inactivo'}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<Pagination
			page={data.list.page}
			totalPages={data.list.totalPages}
			baseUrl="/clientes"
			query={{ q: data.list.q, inactivos: data.list.inactivos ? '1' : '' }}
		/>
	{/if}
</div>

<Modal open={showCreate} title="Registrar cliente" onclose={() => (showCreate = false)}>
	<form
		method="POST"
		action="?/create"
		class="space-y-3"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<input type="hidden" name="idempotencyKey" value={idem} />
		<div>
			<label class="label" for="nombre">Nombre completo *</label>
			<input class="input" id="nombre" name="nombre" required value={values.nombre ?? ''} />
			{#if fieldErrors.nombre}<p class="field-error">{fieldErrors.nombre}</p>{/if}
		</div>
		<div>
			<label class="label" for="empresa">Empresa</label>
			<input class="input" id="empresa" name="empresa" value={values.empresa ?? ''} />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="rfc">RFC</label>
				<input class="input" id="rfc" name="rfc" value={values.rfc ?? ''} />
				{#if fieldErrors.rfc}<p class="field-error">{fieldErrors.rfc}</p>{/if}
			</div>
			<div>
				<label class="label" for="telefono">Teléfono</label>
				<input class="input" id="telefono" name="telefono" inputmode="tel" placeholder="+52 614 123 4567" value={values.telefono ?? ''} />
				{#if fieldErrors.telefono}<p class="field-error">{fieldErrors.telefono}</p>{/if}
			</div>
		</div>
		<div>
			<label class="label" for="correo">Correo *</label>
			<input class="input" id="correo" name="correo" type="email" required value={values.correo ?? ''} />
			{#if fieldErrors.correo}<p class="field-error">{fieldErrors.correo}</p>{/if}
		</div>
		<div>
			<label class="label" for="direccion">Dirección</label>
			<input class="input" id="direccion" name="direccion" value={values.direccion ?? ''} />
		</div>
		<div>
			<label class="label" for="notas">Notas</label>
			<textarea class="input min-h-24" id="notas" name="notas">{values.notas ?? ''}</textarea>
		</div>
		{#if fieldErrors._form}<p class="field-error">{fieldErrors._form}</p>{/if}
		<button class="btn-primary w-full" type="submit" disabled={saving}>
			{saving ? 'Guardando…' : 'Registrar cliente'}
		</button>
	</form>
</Modal>

<Toast toasts={toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
