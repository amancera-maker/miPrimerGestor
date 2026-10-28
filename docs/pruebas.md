# Pruebas GestorPyme

## Unitarias (Vitest) — EJECUTADAS ✅

`npm run test:unit` → **15 passed**

| Suite | Resultado |
|-------|-----------|
| money (IVA, enteros, saldo, NaN) | OK |
| normalize (nombre, teléfono MX, RFC) | OK |
| validators (cliente, fechas, pago) | OK |

## Build — EJECUTADO ✅

`npm run build` + `@sveltejs/adapter-node` → **OK**

## Smoke de dominio (Prisma) — EJECUTADO ✅

`node scripts/smoke-flow.mjs`

- Crear cliente
- Bloquear duplicado por nombre normalizado
- Crear cotización COT-AAAA-NNN
- Flujo a FACTURADA
- Pago parcial + total → PAGADA
- Token público

## Playwright e2e — EJECUTADAS ✅

`npx playwright test` → **4 passed**

| Caso | Resultado |
|------|-----------|
| GET /api/health | OK |
| Bypass auth → Dashboard | OK |
| Navegación clientes/cotizaciones/cobranza/reportes | OK |
| Viewport 375px sin overflow horizontal | OK |

## Integraciones externas

| Integración | Estado |
|-------------|--------|
| PostgreSQL local + migrate | **FUNCIONAL** |
| Supabase producción | PENDIENTE (credencial) |
| Clerk Google OAuth | PENDIENTE (credencial) — bypass local OK |
| Resend envío real | PENDIENTE (credencial) |

## Responsive checklist

| Ancho | Estado |
|-------|--------|
| 320 | NO VERIFICADO (layout adaptado) |
| 360 | NO VERIFICADO |
| 375 | **VERIFICADO** (e2e overflow) |
| 390 | NO VERIFICADO |
| 768 | NO VERIFICADO |
| 1024 | NO VERIFICADO |
| 1440 | NO VERIFICADO |
