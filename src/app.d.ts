/// <reference types="svelte-clerk/env" />

declare global {
	namespace App {
		interface Locals {
			auth: () => {
				userId: string | null;
				sessionClaims?: Record<string, unknown> | null;
			};
			user?: {
				userId: string;
				email: string | null;
				fullName: string | null;
				imageUrl: string | null;
			} | null;
		}
	}
}

export {};
