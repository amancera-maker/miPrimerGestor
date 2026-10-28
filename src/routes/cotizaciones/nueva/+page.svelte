<script>
	import { enhance } from '$app/forms';
	import ClienteCombobox from '$lib/components/ClienteCombobox.svelte';
	import { formatMXN } from '$lib/format.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let clienteId = $state('');
	let saving = $state(false);
	let idem = $state(crypto.randomUUID());
	/** @type {{ descripcion: string, cantidad: string, precioUnitario: string }[]} */
	let conceptos = $state([{ descripcion: '', cantidad: '1', precioUnitario: '' }]);

	$effect(() => {
		clienteId = data.initialCliente?.id ?? clienteId;
		if (form?.values?.conceptos) conceptos = form.values.conceptos;
	});

	const fieldErrors = $derived(form?.fieldErrors ?? {});

	const preview = $derived.by(() => {
		let sub = 0;
		for (const c of conceptos) {
			const q = Number(c.cantidad);
			const p = Number(c.precioUnitario);
			if (Number.isInteger(q) && q > 0 && Number.isFinite(p) && p > 0) sub += q * p;
		}
		const iva = Math.round(sub * 0.16 * 100) / 100;
		const total = Math.round((sub + iva) * 100) / 100;
		return { subtotal: sub, iva, total };
	});

	function addRow() {
		conceptos = [...conceptos, { descripcion: '', cantidad: '1', precioUnitario: '' }];
	}

	/**
	 * @param {number} i
	 */
	function removeRow(i) {
		if (conceptos.length <= 1) return;
		conceptos = conceptos.filter((_, idx) => idx !== i);
	}
</script>

<div class="mx-auto max-w-3xl space-y-5">
	<div>
		<a href="/cotizaciones" class="text-sm text-[var(--color-brand-800)] hover:underline">← Cotizaciones</a>
		<h1 class="font-display mt-1 text-3xl text-[var(--color-brand-900)]">Nueva cotización</h1>
	</div>

	<form
		method="POST"
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
				<input class="input" id="fecha" name="fecha" type="date" required value={form?.values?.fecha ?? data.defaults.fecha} />
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
				<button type="button" class="btn-secondary" onclick={addRow}>Agregar concepto</button>
			</div>
			{#each conceptos as c, i}
				<div class="grid gap-2 rounded-lg border border-[var(--color-line)] p-3 sm:grid-cols-[1fr_5rem_8rem_auto]">
					<div>
						<label class="label" for={`d-${i}`}>Descripción *</label>
						<input class="input" id={`d-${i}`} name="concepto_descripcion" bind:value={c.descripcion} required />
						{#if fieldErrors[`conceptos.${i}.descripcion`]}
							<p class="field-error">{fieldErrors[`conceptos.${i}.descripcion`]}</p>
						{/if}
					</div>
					<div>
						<label class="label" for={`c-${i}`}>Cant.</label>
						<input class="input" id={`c-${i}`} name="concepto_cantidad" type="number" min="1" step="1" bind:value={c.cantidad} required />
					</div>
					<div>
						<label class="label" for={`p-${i}`}>P. unitario</label>
						<input class="input" id={`p-${i}`} name="concepto_precio" inputmode="decimal" bind:value={c.precioUnitario} required />
						{#if fieldErrors[`conceptos.${i}.precioUnitario`]}
							<p class="field-error">{fieldErrors[`conceptos.${i}.precioUnitario`]}</p>
						{/if}
					</div>
					<div class="flex items-end">
						<button type="button" class="btn-ghost" onclick={() => removeRow(i)} disabled={conceptos.length === 1}>Quitar</button>
					</div>
				</div>
			{/each}
			{#if fieldErrors.conceptos}<p class="field-error">{fieldErrors.conceptos}</p>{/if}
		</div>

		<div class="rounded-lg bg-[var(--color-brand-50)] p-4 text-sm">
			<div class="flex justify-between"><span>Subtotal</span><span>{formatMXN(preview.subtotal)}</span></div>
			<div class="mt-1 flex justify-between"><span>IVA 16%</span><span>{formatMXN(preview.iva)}</span></div>
			<div class="mt-2 flex justify-between text-base font-semibold"><span>Total</span><span>{formatMXN(preview.total)}</span></div>
		</div>

		<div>
			<label class="label" for="notas">Notas / condiciones</label>
			<textarea class="input min-h-24" id="notas" name="notas">{form?.values?.notas ?? ''}</textarea>
		</div>

		{#if fieldErrors._form}<p class="field-error">{fieldErrors._form}</p>{/if}
		{#if form?.message}<p class="field-error">{form.message}</p>{/if}

		<button class="btn-primary w-full" type="submit" disabled={saving || !clienteId}>
			{saving ? 'Guardando…' : 'Guardar borrador'}
		</button>
	</form>
</div>
