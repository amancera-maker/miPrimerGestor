<script>
	import { ESTADO_BADGE, ESTADO_LABEL } from '$lib/format.js';

	/** @type {{ estado: string }} */
	let { estado } = $props();
</script>

<span class={ESTADO_BADGE[estado] ?? 'badge bg-slate-100 text-slate-700'}>
	{ESTADO_LABEL[estado] ?? estado}
</span>
