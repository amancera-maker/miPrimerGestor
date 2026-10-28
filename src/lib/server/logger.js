/**
 * Logs protegidos — nunca enviar al cliente.
 * @param {string} scope
 * @param {unknown} detail
 * @param {Record<string, unknown>} [meta]
 */
export function logError(scope, detail, meta = {}) {
	const payload = {
		ts: new Date().toISOString(),
		scope,
		meta,
		detail:
			detail instanceof Error
				? { message: detail.message, stack: detail.stack, name: detail.name }
				: detail
	};
	console.error('[GestorPyme]', JSON.stringify(payload));
}

/**
 * @param {string} scope
 * @param {Record<string, unknown>} [meta]
 */
export function logInfo(scope, meta = {}) {
	console.info('[GestorPyme]', JSON.stringify({ ts: new Date().toISOString(), scope, meta }));
}
