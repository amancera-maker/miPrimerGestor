/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	return {
		signedOut: url.searchParams.get('signedOut') === '1',
		unauthorized: url.searchParams.get('error') === 'unauthorized'
	};
}
