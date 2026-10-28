# AGENTS.md — GestorPyme

## Rol
Actúa como ejecutor full-stack. Implementa, prueba y corrige. No te limites a dar instrucciones.

## Stack (obligatorio)
SvelteKit + Svelte 5 + JavaScript + Tailwind + PostgreSQL/Supabase + Prisma 6 + Clerk (`svelte-clerk`) + Resend + Chart.js + Zod + Decimal.js + Vitest + Playwright + adapter-node (Render).

**No usar:** Next.js, TypeScript de app, Firebase, Neon, Auth.js/NextAuth, shadcn/ui React, Recharts.

## Reglas de negocio críticas
- Un despacho por deploy (sin multi-tenant).
- Clientes activos: nombre normalizado único + RFC único si existe.
- Teléfono MX: 10 dígitos, opcional +52; sin letras; normalizar al guardar.
- Cotizaciones: cantidades enteras; IVA 16%; Decimal.js (no float).
- Estados: BORRADOR→ENVIADA→APROBADA→FACTURADA; ENVIADA→RECHAZADA; reabrir RECHAZADA→BORRADOR con motivo.
- **PAGADA solo por pagos** que cubren el total (nunca botón manual).
- Cobranza/dashboard: misma lógica (`finance.js`) — APROBADA/FACTURADA con saldo > 0.
- Facturado del mes: usa `facturadaEn`, no el estado actual.
- Correos: separar estado de cotización vs notificación; errores amigables al usuario.

## Seguridad
- Validar siempre en servidor.
- Proteger rutas y actions.
- No exponer secretos ni errores técnicos de proveedores.
- Allowlist `AUTHORIZED_EMAILS` en producción.
- `DEV_BYPASS_AUTH` solo en desarrollo.

## Flujo de trabajo
1. Leer `docs/requisitos.md` y este archivo.
2. Implementar → build → pruebas → actualizar `docs/progreso.md`.
3. Commits por etapas estables cuando el usuario lo pida o al cerrar fase.

## Credenciales externas necesarias
- `DATABASE_URL` (Supabase PostgreSQL)
- `PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (+ Google OAuth en Clerk)
- `RESEND_API_KEY` + `FROM_EMAIL`
