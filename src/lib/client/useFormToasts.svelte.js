/**
 * Evita toasts duplicados cuando un $effect se re-ejecuta
 * (invalidateAll, form sticky, ?msg= en la URL, etc.).
 */

/**
 * @returns {{
 *   consumeFlash: (flash: string | null | undefined, show: (msg: string) => void) => void,
 *   consumeForm: (form: any, handlers: {
 *     onSuccess?: (form: any) => void,
 *     onError?: (form: any) => void,
 *     onFieldErrors?: (form: any) => void
 *   }) => void
 * }}
 */
export function createFormToastGate() {
	/** @type {string | null} */
	let lastFlash = null;
	/** @type {string | null} */
	let lastFormKey = null;

	/**
	 * @param {string | null | undefined} flash
	 * @param {(msg: string) => void} show
	 */
	function consumeFlash(flash, show) {
		if (!flash) return;
		if (flash === lastFlash) return;
		lastFlash = flash;
		show(flash);
		if (typeof window === 'undefined') return;
		try {
			const u = new URL(window.location.href);
			if (u.searchParams.has('msg')) {
				u.searchParams.delete('msg');
				const next = u.pathname + (u.search ? u.search : '') + u.hash;
				history.replaceState(history.state, '', next);
			}
		} catch {
			/* ignore */
		}
	}

	/**
	 * @param {any} form
	 * @param {{
	 *   onSuccess?: (form: any) => void,
	 *   onError?: (form: any) => void,
	 *   onFieldErrors?: (form: any) => void
	 * }} handlers
	 */
	function consumeForm(form, handlers = {}) {
		if (!form) return;
		if (form.success) {
			const key = `ok:${String(form.message ?? form.flash ?? '')}:${String(form.saldoPendiente ?? '')}`;
			if (key === lastFormKey) return;
			lastFormKey = key;
			handlers.onSuccess?.(form);
			return;
		}
		if (form.fieldErrors || form.errors) {
			const key = `fields:${JSON.stringify(form.fieldErrors || form.errors)}`;
			if (key === lastFormKey) return;
			lastFormKey = key;
			handlers.onFieldErrors?.(form);
			return;
		}
		if (form.message || form.error) {
			const key = `err:${String(form.message || form.error)}`;
			if (key === lastFormKey) return;
			lastFormKey = key;
			handlers.onError?.(form);
		}
	}

	return { consumeFlash, consumeForm };
}
