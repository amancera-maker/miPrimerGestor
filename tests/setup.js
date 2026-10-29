process.env.DATABASE_URL =
	process.env.DATABASE_URL_TEST ||
	'postgresql://postgres:postgres@127.0.0.1:5432/gestorpyme_test?schema=public';
process.env.DEV_BYPASS_AUTH = 'true';
process.env.PUBLIC_ORIGIN = 'http://127.0.0.1:4173';
// Sin Resend real en suite
delete process.env.RESEND_API_KEY;
