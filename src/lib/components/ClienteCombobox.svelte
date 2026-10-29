<script>
	/** @type {{ name?: string, value?: string, label?: string, error?: string, initialLabel?: string }} */
	let {
		name = 'clienteId',
		value = $bindable(''),
		label = 'Cliente',
		error = '',
		initialLabel = ''
	} = $props();

	let query = $state('');
	let open = $state(false);
	let loading = $state(false);
	/** @type {{ id: string, nombre: string, empresa: string | null, rfc: string | null }[]} */
	let items = $state([]);
	let highlight = $state(0);
	let selectedLabel = $state('');
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timer = null;

	$effect(() => {
		if (initialLabel) selectedLabel = initialLabel;
	});

	/**
	 * @param {string} q
	 */
	async function search(q) {
		loading = true;
		try {
			const res = await fetch(`/api/clientes/buscar?q=${encodeURIComponent(q)}`);
			if (!res.ok) throw new Error('fail');
			const data = await res.json();
			items = data.items ?? [];
			highlight = 0;
		} catch {
			items = [];
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {string} q
	 */
	function onInput(q) {
		query = q;
		open = true;
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => search(q), 300);
	}

	/**
	 * @param {{ id: string, nombre: string, empresa: string | null, rfc: string | null }} item
	 */
	function select(item) {
		value = item.id;
		selectedLabel = `${item.nombre}${item.empresa ? ` · ${item.empresa}` : ''}${item.rfc ? ` · ${item.rfc}` : ''}`;
		query = '';
		open = false;
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	function onKeydown(e) {
		if (!open) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlight = Math.min(highlight + 1, Math.max(0, items.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlight = Math.max(highlight - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (items[highlight]) select(items[highlight]);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="relative">
	<label class="label" for="cliente-combo">{label}</label>
	<input type="hidden" {name} {value} />
	{#if value && selectedLabel && !open}
		<button
			type="button"
			id="cliente-combo"
			class="input flex min-h-11 items-center justify-between text-left"
			onclick={() => {
				open = true;
				search('');
			}}
		>
			<span class="truncate">{selectedLabel}</span>
			<span class="text-[var(--color-muted)]">Cambiar</span>
		</button>
	{:else}
		<input
			id="cliente-combo"
			class="input"
			type="search"
			placeholder="Escribe para buscar entre todos los clientes…"
			autocomplete="off"
			bind:value={query}
			oninput={(e) => onInput(/** @type {HTMLInputElement} */ (e.currentTarget).value)}
			onfocus={() => {
				open = true;
				search(query || '');
			}}
			onkeydown={onKeydown}
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls="cliente-listbox"
		/>
	{/if}
	{#if open}
		<ul
			id="cliente-listbox"
			class="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--color-line)] bg-white shadow-lg"
			role="listbox"
		>
			{#if loading}
				<li class="px-3 py-3 text-sm text-[var(--color-muted)]">Buscando…</li>
			{:else if items.length === 0}
				<li class="px-3 py-3 text-sm text-[var(--color-muted)]">Sin resultados</li>
			{:else}
				{#each items as item, i}
					<li role="option" aria-selected={i === highlight}>
						<button
							type="button"
							class="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-[var(--color-brand-50)] {i ===
							highlight
								? 'bg-[var(--color-brand-50)]'
								: ''}"
							onclick={() => select(item)}
							onmouseenter={() => (highlight = i)}
						>
							<span class="font-medium">{item.nombre}</span>
							<span class="text-xs text-[var(--color-muted)]">
								{[item.empresa, item.rfc].filter(Boolean).join(' · ') || 'Sin empresa / RFC'}
							</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>
