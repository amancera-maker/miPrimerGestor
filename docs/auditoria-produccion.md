# Auditoría de preparación a producción — GestorPyme

Fecha de preparación: 2026-10-29.  
Alcance: configuración reproducible + hardening. **Sin secretos de terceros en esta máquina, no hay URL pública verificada.**

## Resumen ejecutivo

| Servicio | Configurado en código/docs | Probado en prod | Pendiente humano |
|----------|----------------------------|-----------------|------------------|
| Git / GitHub | Sí (rama `main`, ignore secretos) | Push no ejecutado (sin auth `gh`) | Crear repo + autorizar push |
| PostgreSQL / Prisma | Modelo, migración init, SSL docs, backup script | Solo DB local/test | Proyecto Supabase + migrate deploy |
| Clerk | Hooks + allowlist + bypass bloqueado en prod | No (sin claves live) | App prod, Google, redirects |
| Resend | Mailer + `FROM_EMAIL` | No (sin API key / dominio) | Verificar dominio + prueba interna |
| Render | `render.yaml` + health | No desplegado | Crear servicio + env vars |
| App build | adapter-node, start `build/index.js` | `npm run build` OK (adapter-node) | — |

**URL real de producción:** *no disponible — deploy no ejecutado.*

Commits locales en `main`: `19a3218` (auditoría), `3a8d162` (prep. deploy). Push a GitHub pendiente de `gh auth login`.

## Checklist técnico ejecutado / preparado

### Proyecto

- [x] `package.json` con `engines.node >= 22.12`, scripts `start`, `db:deploy`, `check:env`, `smoke:prod`, `db:backup`
- [x] `@sveltejs/adapter-node` activo
- [x] Secretos excluidos (`.gitignore`: `.env`, `.env.*`, `backups/`)
- [x] Sin seed de clientes ficticios en rutas de producción (datos demo solo en tests/scripts locales)
- [x] `DEV_BYPASS_AUTH` **no** activa sesión si `NODE_ENV=production` (`src/lib/server/env.js` + hooks)

### Seguridad rutas (pre-prod)

- Rutas app protegidas vía hooks + Clerk cuando está configurado
- `/api/health` público; responde 503 si DB caída
- Tokens públicos de cotización: hash + expiración (modelo existente)

### Lo no verificado (falta entorno)

- Login Google en dominio real
- Persistencia clientes/cotizaciones/pagos contra Supabase prod
- Envío Resend aceptado por proveedor
- Responsive sobre URL Render
- Logs y métricas Render en vivo

## Intervención humana imprescindible

1. **Supabase:** crear proyecto; entregar `DATABASE_URL` (pooler + directa) con SSL — pegar solo en Render, no en chat si es posible.
2. **Clerk:** app producción, Google, allowed origins = URL Render; claves live en Render.
3. **Resend:** API key + dominio/`FROM_EMAIL`; autorización para un correo de prueba interno.
4. **GitHub:** crear repo vacío (privado recomendado); autenticar `gh auth login` o SSH; autorizar push de `main`.
5. **Render:** conectar repo, cargar env vars, desplegar Blueprint; comunicar URL resultante.
6. **Aprobación:** no enviar correos a clientes reales hasta OK explícito.

Tras (5), ejecutar:

```bash
node scripts/smoke-prod.mjs https://URL-REAL
```

y completar humo autenticado; actualizar esta tabla con resultados reales (sin inventar).

## Evidencia de hardening (archivos)

| Cambio | Archivo |
|--------|---------|
| Bypass prod-safe | `src/lib/server/env.js`, `src/hooks.server.js`, `src/lib/server/auth.js` |
| Health + DB | `src/routes/api/health/+server.js` |
| Blueprint Render | `render.yaml` |
| Preflight / backup / smoke | `scripts/check-env.mjs`, `backup-db.mjs`, `smoke-prod.mjs` |
| Docs | `docs/deploy.md`, `docs/variables-entorno.md`, `docs/recuperacion.md` |
