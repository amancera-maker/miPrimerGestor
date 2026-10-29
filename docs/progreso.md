# Progreso GestorPyme

Última actualización: 2026-10-28

## Estado por fase

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Lectura PDF + requisitos | **COMPLETADA** |
| 1 | Init SvelteKit, deps, arquitectura | **COMPLETADA** |
| 2 | Prisma, modelos, migraciones | **COMPLETADA** (Postgres local + migrate deploy) |
| 3 | Clerk + protección | **PARCIAL** (svelte-clerk listo; `DEV_BYPASS_AUTH` verificado; claves Clerk pendientes) |
| 4 | Layout responsive | **COMPLETADA** (fix overflow 320px en auditoría) |
| 5 | CRUD clientes | **COMPLETADA** |
| 6 | Cotizaciones y estados | **COMPLETADA** |
| 7 | Pagos y cobranza | **COMPLETADA** (FOR UPDATE concurrente) |
| 8 | Resend / notificaciones | **PARCIAL** (mailer mock auditado; API key real pendiente) |
| 9 | Dashboard financiero | **COMPLETADA** |
| 10 | PDF y reportes | **COMPLETADA** |
| 11 | Pruebas y producción | **PARCIAL** — ver `docs/auditoria-final.md` (50 vitest + 55 playwright + HTTP) |

## Verificaciones reales ejecutadas

- Extracción PDF 48 páginas → `docs/requisitos.md`
- `npm install` + `npx prisma generate`
- Migración `20261028120000_init` aplicada en PostgreSQL local
- `npm run build` (adapter-node) **OK**
- Vitest: **15/15 passed**
- Smoke DB (`scripts/smoke-flow.mjs`): cliente, anti-duplicado, cotización, pagos → PAGADA **OK**
- Playwright e2e: **4/4 passed** (health, dashboard bypass, navegación, responsive 375)
- HTTP: `/api/health`, `/dashboard`, `/clientes`, `/cotizaciones`, `/cobranza`

## Intervención humana indispensable

1. **Producción DB:** `DATABASE_URL` de Supabase (reemplazar Postgres local).
2. **Clerk:** `PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` + Google OAuth; quitar `DEV_BYPASS_AUTH`.
3. **Allowlist:** `AUTHORIZED_EMAILS` con correos del despacho.
4. **Resend:** `RESEND_API_KEY` + `FROM_EMAIL` (+ dominio verificado).
5. **Render:** conectar repo GitHub, env vars, release `prisma migrate deploy`.

## Cómo levantar local ahora

```bash
# Postgres local (si usas el cluster de usuario)
# "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D "%USERPROFILE%\pgdata-gestorpyme" -l "%USERPROFILE%\pgdata-gestorpyme\pg.log" start

npm install
npx prisma migrate deploy
npm run dev
# Abrir http://localhost:5173 — con DEV_BYPASS_AUTH=true entra al dashboard
```
