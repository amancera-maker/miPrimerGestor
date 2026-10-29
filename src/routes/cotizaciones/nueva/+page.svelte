<script>
	import { enhance } from '$app/forms';
	import ClienteCombobox from '$lib/components/ClienteCombobox.svelte';
	import { formatMXN } from '$lib/format.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let clienteId = $state('');
	let saving = $state(false);
	let idem = $state(crypto.randomUUID());
	/** @type {{ descripcion: string, cantidad: string, precio: string }[]} */
	let conceptos = $state([{ descripcion: '', cantidad: '1', precio: '' }]);

	$effect(() => {
		clienteId = data.initialCliente?.id ?? clienteId;
		if (form?.values?.conceptos) {
			conceptos = form.values.conceptos.map((/** @type {any} */ c) => ({
				descripcion: c.descripcion ?? '',
				cantidad: String(c.cantidad ?? '1'),
				precio: String(c.precioUnitario ?? c.precio ?? '')
			}));
		}
	});

	const fieldErrors = $derived(form?.fieldErrors ?? {});

	const preview = $derived.by(() => {
		let sub = 0;
		const lineas = conceptos.map((c) => {
			const q = Number(c.cantidad);
			const p = Number(c.precio);
			const ok = Number.isInteger(q) && q > 0 && Number.isFinite(p) && p > 0;
			const rowSub = ok ? q * p : 0;
			if (ok) sub += rowSub;
			return { ...c, subtotal: rowSub };
		});
		const iva = Math.round(sub * 0.16 * 100) / 100;
		const total = Math.round((sub + iva) * 100) / 100;
		return { lineas, subtotal: sub, iva, total };
	});

	function addConcepto() {
		conceptos = [...conceptos, { descripcion: '', cantidad: '1', precio: '' }];
	}

	/**
	 * @param {number} i
	 */
	function removeConcepto(i) {
		if (conceptos.length <= 1) return;
		conceptos = conceptos.filter((_, idx) => idx !== i);
	}
</script>

<div class="mx-auto max-w-3xl space-y-5">
	<div>
		<a href="/cotizaciones" class="text-sm text-[var(--color-brand-800)] hover:underline">← Cotizaciones</a>
		<h1 class="font-display mt-1 text-3xl text-[var(--color-brand-900)]">Nueva cotización</h1>
		<p class="mt-1 text-sm text-[var(--color-muted)]">
			Número siguiente: <span class="font-semibold text-[var(--color-brand-900)]">{data.numeroSiguiente}</span>
		</p>
	</div>

	<form
		method="POST"
		action="?/guardar"
		class="card-panel space-y-4"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<input type="hidden" name="idempotencyKey" value={idem} />

		<ClienteCombobox
			bind:value={clienteId}
			error={fieldErrors.clienteId}
			initialLabel={data.initialCliente
				? `${data.initialCliente.nombre}${data.initialCliente.empresa ? ` · ${data.initialCliente.empresa}` : ''}`
				: ''}
		/>

		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label" for="fecha">Fecha de emisión *</label>
				<input
					class="input"
					id="fecha"
					name="fecha"
					type="date"
					required
					value={form?.values?.fecha ?? data.defaults.fecha}
				/>
				{#if fieldErrors.fecha}<p class="field-error">{fieldErrors.fecha}</p>{/if}
			</div>
			<div>
				<label class="label" for="vencimiento">Fecha de vencimiento *</label>
				<input
					class="input"
					id="vencimiento"
					name="vencimiento"
					type="date"
					required
					value={form?.values?.vencimiento ?? data.defaults.vencimiento}
				/>
				{#if fieldErrors.vencimiento}<p class="field-error">{fieldErrors.vencimiento}</p>{/if}
			</div>
		</div>

		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="font-semibold">Conceptos</h2>
				<button type="button" class="btn-secondary" onclick={addConcepto}>Agregar concepto</button>
			</div>

			<div class="table-wrap rounded-lg border border-[var(--color-line)]">
				<table class="data-table">
					<thead>
						<tr>
							<th>Descripción</th>
							<th>Cant.</th>
							<th>P. unitario</th>
							<th>Subtotal</th>
							<th></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-line)]">
						{#each conceptos as c, i}
							<tr>
								<td class="!whitespace-normal">
									<input
										class="input"
										name="concepto_descripcion"
										bind:value={c.descripcion}
										required
										placeholder="Descripción"
									/>
									{#if fieldErrors[`conceptos.${i}.descripcion`]}
										<p class="field-error">{fieldErrors[`conceptos.${i}.descripcion`]}</p>
									{/if}
								</td>
								<td>
									<input
										class="input w-20"
										name="concepto_cantidad"
										type="number"
										min="1"
										step="1"
										bind:value={c.cantidad}
										required
									/>
								</td>
								<td>
									<input
										class="input w-28"
										name="concepto_precio"
										inputmode="decimal"
										bind:value={c.precio}
										required
									/>
									{#if fieldErrors[`conceptos.${i}.precioUnitario`]}
										<p class="field-error">{fieldErrors[`conceptos.${i}.precioUnitario`]}</p>
									{/if}
								</td>
								<td class="text-sm font-medium">{formatMXN(preview.lineas[i]?.subtotal ?? 0)}</td>
								<td>
									<button
										type="button"
										class="btn-ghost"
										onclick={() => removeConcepto(i)}
										disabled={conceptos.length === 1}>Quitar</button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if fieldErrors.conceptos}<p class="field-error">{fieldErrors.conceptos}</p>{/if}
		</div>

		<div class="rounded-lg bg-[var(--color-brand-50)] p-4 text-sm">
			<div class="flex justify-between"><span>Subtotal</span><span>{formatMXN(preview.subtotal)}</span></div>
			<div class="mt-1 flex justify-between"><span>IVA 16%</span><span>{formatMXN(preview.iva)}</span></div>
			<div class="mt-2 flex justify-between text-base font-semibold">
				<span>Total</span><span>{formatMXN(preview.total)}</span>
			</div>
		</div>

		<div>
			<label class="label" for="notas">Notas / condiciones</label>
			<textarea class="input min-h-24" id="notas" name="notas">{form?.values?.notas ?? ''}</textarea>
		</div>

		{#if fieldErrors._form}<p class="field-error">{fieldErrors._form}</p>{/if}
		{#if form?.error || form?.message}<p class="field-error">{form.error || form.message}</p>{/if}

		<div class="grid gap-2 sm:grid-cols-2">
			<button
				class="btn-secondary w-full"
				type="submit"
				name="intent"
				value="borrador"
				disabled={saving || !clienteId}
			>
				{saving ? 'Guardando…' : 'Guardar borrador'}
			</button>
			<button
				class="btn-primary w-full"
				type="submit"
				name="intent"
				value="enviar"
				disabled={saving || !clienteId}
			>
				{saving ? 'Enviando…' : 'Enviar al cliente'}
			</button>
		</div>
	</form>
</div>
