/** @type {Record<string, string[]>} */
export const TRANSICIONES = {
	BORRADOR: ['ENVIADA'],
	ENVIADA: ['APROBADA', 'RECHAZADA'],
	APROBADA: ['FACTURADA'],
	RECHAZADA: [],
	FACTURADA: [],
	PAGADA: []
};
