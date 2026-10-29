<script>
	import { enhance } from '$app/forms';
	import { invalidate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { formatFecha } from '$lib/format.js';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { createFormToastGate } from '$lib/client/useFormToasts.svelte.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let showModal = $state(false);
	/** @type {'crear' | 'editar'} */
	let modalMode = $state('crear');
	/** @type {any | null} */
	let editing = $state(null);
	let saving = $state(false);
	let busqueda = $state('');
	let pagina = $state(1);
	let idem = $state(crypto.randomUUID());
	/** @type {{ id: number, type: 'success'|'error'|'info', message: string }[]} */
	let toasts = $state([]);
	/** @type {Record<string, string>} */
	let values = $state({});
	let telefonoDraft = $state('');

	const PAGE_SIZE = 20;

	const clientesFiltrados = $derived.by(() => {
		const q = busqueda.trim().toLowerCase();
		const list = data.clientes ?? [];
		if (!q) return list;
		return list.filter((c) => {
			const nombre = (c.nombre || '').toLowerCase();
			const empresa = (c.empresa || '').toLowerCase();
			const rfc = (c.rfc || '').toLowerCase();
			return nombre.includes(q) || empresa.includes(q) || rfc.includes(q);
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE)));
	const paginaSegura = $derived(Math.min(pagina, totalPages));
	const paginaItems = $derived(
		clientesFiltrados.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE)
	);

	$effect(() => {
		busqueda;
		pagina = 1;
	});

	const toastGate = createFormToastGate();

	$effect(() => {
		if (form?.values) {
			values = { ...form.values };
			telefonoDraft = String(form.values.telefono ?? '');
		}
		toastGate.consumeForm(form, {
			onSuccess: (f) => {
				showModal = false;
				editing = null;
				saving = false;
				idem = crypto.randomUUID();
				pushToast('success', f.flash || f.message || 'Listo');
				invalidate('app:clientes');
			},
			onError: (f) => {
				pushToast('error', f.message || f.error || 'Error');
				saving = false;
			},
			onFieldErrors: () => {
				showModal = true;
				saving = false;
			}
		});
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

	function openCrear() {
		modalMode = 'crear';
		editing = null;
		values = {};
		telefonoDraft = '';
		idem = crypto.randomUUID();
		showModal = true;
	}

	/** @param {any} c */
	function openEditar(c) {
		if (!c.activo) return;
		modalMode = 'editar';
		editing = c;
		values = {
			id: c.id,
			nombre: c.nombre ?? '',
			empresa: c.empresa ?? '',
			rfc: c.rfc ?? '',
			correo: c.correo ?? '',
			telefono: c.telefono ?? '',
			direccion: c.direccion ?? '',
			notas: c.notas ?? ''
		};
		telefonoDraft = c.telefono ?? '';
		showModal = true;
	}

	/** @param {Event} e */
	function onTelefonoInput(e) {
		const el = /** @type {HTMLInputElement} */ (e.currentTarget);
		// Solo dígitos y separadores telefónicos
		telefonoDraft = el.value.replace(/[^\d\s+\-().]/g, '');
		el.value = telefonoDraft;
	}

	function toggleInactivos() {
		const url = new URL($page.url);
		if (data.mostrarInactivos) url.searchParams.delete('inactivos');
		else url.searchParams.set('inactivos', '1');
		goto(`${url.pathname}${url.search}`, { invalidateAll: true });
	}

	const fieldErrors = $derived(form?.errors ?? form?.fieldErrors ?? {});
	const actionName = $derived(modalMode === 'editar' ? '?/editar' : '?/crear');
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<header class="page-header">
			<h1>Clientes</h1>
			<p>
				{clientesFiltrados.length} registro{clientesFiltrados.length === 1 ? '' : 's'}
				{#if !data.mostrarInactivos}
					(activos)
				{/if}
			</p>
		</header>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn-secondary" onclick={toggleInactivos}>
				{data.mostrarInactivos ? 'Ocultar inactivos' : 'Mostrar inactivos'}
			</button>
			<button type="button" class="btn-primary" onclick={openCrear}>Registrar cliente</button>
		</div>
	</div>

	<input
		class="input max-w-xl"
		type="search"
		bind:value={busqueda}
		placeholder="Buscar por nombre, empresa o RFC"
		aria-label="Buscar clientes"
	/>

	{#if paginaItems.length === 0}
		<EmptyState
			title="No hay clientes"
			description={busqueda
				? 'Ningún cliente coincide con la búsqueda.'
				: 'Registra el primero para empezar a cotizar.'}
			actionLabel="Registrar cliente"
			actionHref="#"
		/>
		<button type="button" class="btn-primary" onclick={openCrear}>Registrar cliente</button>
	{:else}
		<div class="card-panel p-0">
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Nombre</th>
							<th>Empresa</th>
							<th>RFC</th>
							<th>Correo</th>
							<th>Teléfono</th>
							<th>Estado</th>
							<th>Alta</th>
							<th>Acciones</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each paginaItems as c (c.id)}
							<tr class="hover:bg-[var(--color-brand-50)]/60 {!c.activo ? 'opacity-70' : ''}">
								<td>
									<a
										class="font-medium text-[var(--color-brand-800)] hover:underline"
										href={`/clientes/${c.id}`}>{c.nombre}</a
									>
								</td>
								<td>{c.empresa || '—'}</td>
								<td>{c.rfc || '—'}</td>
								<td class="max-w-[12rem] truncate">{c.correo}</td>
								<td>{c.telefono || '—'}</td>
								<td>
									<span
										class={c.activo
											? 'badge bg-emerald-100 text-emerald-800'
											: 'badge bg-slate-200 text-slate-700'}
									>
										{c.activo ? 'Activo' : 'Inactivo'}
									</span>
								</td>
								<td>{formatFecha(c.creadoEn)}</td>
								<td>
									<div class="flex flex-wrap gap-1">
										<a class="btn-ghost px-2 py-1 text-xs" href={`/clientes/${c.id}`}>Ver</a>
										{#if c.activo}
											<button
												type="button"
												class="btn-ghost px-2 py-1 text-xs"
												onclick={() => openEditar(c)}>Editar</button
											>
											<form method="POST" action="?/desactivar" use:enhance>
												<input type="hidden" name="id" value={c.id} />
												<button
													type="submit"
													class="btn-ghost px-2 py-1 text-xs text-red-700"
													onclick={(e) => {
														if (!confirm(`¿Desactivar a ${c.nombre}?`)) e.preventDefault();
													}}>Desactivar</button
												>
											</form>
										{:else}
											<form method="POST" action="?/reactivar" use:enhance>
												<input type="hidden" name="id" value={c.id} />
												<button type="submit" class="btn-ghost px-2 py-1 text-xs text-emerald-800"
													>Reactivar</button
												>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-between gap-3 text-sm">
				<button
					type="button"
					class="btn-secondary"
					disabled={paginaSegura <= 1}
					onclick={() => (pagina = paginaSegura - 1)}>Anterior</button
				>
				<p class="text-[var(--color-muted)]">Página {paginaSegura} de {totalPages}</p>
				<button
					type="button"
					class="btn-secondary"
					disabled={paginaSegura >= totalPages}
					onclick={() => (pagina = paginaSegura + 1)}>Siguiente</button
				>
			</div>
		{/if}
	{/if}
</div>

<Modal
	open={showModal}
	title={modalMode === 'editar' ? 'Editar cliente' : 'Registrar cliente'}
	onclose={() => {
		if (saving) return;
		showModal = false;
		editing = null;
	}}
>
	<form
		method="POST"
		action={actionName}
		class="space-y-3"
		use:enhance={() => {
			if (saving) return async () => {};
			saving = true;
			return async ({ update, result }) => {
				await update();
				if (result.type !== 'success') saving = false;
			};
		}}
	>
		{#if modalMode === 'editar' && editing}
			<input type="hidden" name="id" value={editing.id} />
		{:else}
			<input type="hidden" name="idempotencyKey" value={idem} />
		{/if}
		<div>
			<label class="label" for="nombre">Nombre completo *</label>
			<input class="input" id="nombre" name="nombre" required value={values.nombre ?? ''} />
			{#if fieldErrors.nombre}<p class="field-error">{fieldErrors.nombre}</p>{/if}
			<p class="mt-1 text-xs text-[var(--color-muted)]">No puede repetirse entre clientes activos.</p>
		</div>
		<div>
			<label class="label" for="empresa">Empresa</label>
			<input class="input" id="empresa" name="empresa" value={values.empresa ?? ''} />
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="rfc">RFC (opcional)</label>
				<input
					class="input uppercase"
					id="rfc"
					name="rfc"
					maxlength="15"
					placeholder="Ej. GODE561231GR8"
					value={values.rfc ?? ''}
					oninput={(e) => {
						const el = /** @type {HTMLInputElement} */ (e.currentTarget);
						el.value = el.value.toUpperCase().replace(/[^A-ZÑ&0-9]/gi, '');
					}}
				/>
				{#if fieldErrors.rfc}<p class="field-error">{fieldErrors.rfc}</p>{/if}
				<p class="mt-1 text-xs text-[var(--color-muted)]">
					12 caracteres (empresa) o 13 (persona). Puedes dejarlo vacío.
				</p>
			</div>
			<div>
				<label class="label" for="telefono">Teléfono</label>
				<input
					class="input"
					id="telefono"
					name="telefono"
					type="tel"
					inputmode="tel"
					autocomplete="tel"
					pattern="[\d\s+\-().]*"
					title="Solo dígitos y separadores (+, espacios, guiones)"
					placeholder="+52 614 123 4567"
					value={telefonoDraft}
					oninput={onTelefonoInput}
				/>
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
			{saving ? 'Guardando…' : modalMode === 'editar' ? 'Guardar cambios' : 'Registrar cliente'}
		</button>
	</form>
</Modal>

<Toast {toasts} ondismiss={(id) => (toasts = toasts.filter((t) => t.id !== id))} />
