/**
 * Adaptador de correo inyectable (Resend en prod, mock en pruebas).
 * @typedef {{ ok: true, id?: string } | { ok: false, error: unknown }} MailResult
 * @typedef {{ from: string, to: string, subject: string, html: string }} MailPayload
 * @typedef {{ send: (payload: MailPayload) => Promise<MailResult> }} Mailer
 */

/** @type {Mailer | null} */
let overrideMailer = null;

/** @type {MailPayload[]} */
export const sentMailLog = [];

/**
 * @param {Mailer | null} mailer
 */
export function setMailer(mailer) {
	overrideMailer = mailer;
	sentMailLog.length = 0;
}

/**
 * @returns {Mailer | null}
 */
export function getMailerOverride() {
	return overrideMailer;
}

/**
 * Mailer que siempre falla (auditoría de errores).
 * @returns {Mailer}
 */
export function createFailingMailer(message = 'Simulated provider failure') {
	return {
		async send() {
			return { ok: false, error: { message, code: 'TEST_FAIL' } };
		}
	};
}

/**
 * Mailer que acepta sin entrega confirmada.
 * @returns {Mailer}
 */
export function createAcceptingMailer() {
	return {
		async send(payload) {
			sentMailLog.push(payload);
			return { ok: true, id: `test_${sentMailLog.length}` };
		}
	};
}
