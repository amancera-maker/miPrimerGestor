# Despliegue producción — GestorPyme

Stack: **SvelteKit (adapter-node)** + **Prisma 6** + **PostgreSQL (Supabase)** + **Clerk** + **Resend** + **Render** + **GitHub**.

## Estado de esta preparación (máquina local)

| Paso | Estado |
|------|--------|
| `adapter-node` en `svelte.config.js` | Configurado |
| `engines.node >= 22.12` | Configurado |
| `render.yaml` (`npm ci`, `migrate deploy`, `node build/index.js`) | Preparado |
| Health `/api/health` (incluye DB) | Preparado |
| Bypass auth imposible con `NODE_ENV=production` | Preparado |
| `.env` / secretos fuera de Git | Verificado (`.gitignore`) |
| Build local `npm run build` | Ejecutar en checklist |
| Repo GitHub + push | **Pendiente credenciales humanas** |
| Proyecto Supabase prod + `DATABASE_URL` | **Pendiente humano** |
| App Clerk prod + Google OAuth | **Pendiente humano** |
| Dominio/API Resend | **Pendiente humano** |
| Servicio Render live + URL | **Pendiente humano** |
| Smoke post-deploy autenticado | **Pendiente tras URL** |

No se afirma publicación exitosa sin URL verificada.

## 1. Supabase

1. Crear proyecto PostgreSQL (región cercana a Render, p. ej. US West).
2. Copiar **Connection string**:
   - Migraciones / admin: directa `:5432` + `?sslmode=require`
   - App runtime: pooler `:6543` + `?sslmode=require` (y `pgbouncer=true` si Prisma lo requiere en tu URL).
3. **No** ejecutar migraciones destructivas. El build de Render corre `prisma migrate deploy`.
4. Opcional: respaldo inicial vacío tras primer migrate.

Prisma 6 usa el **query engine nativo** (no driver adapter `@prisma/adapter-pg`). No hace falta adapter extra.

## 2. Clerk

1. Aplicación producción; habilitar Google.
2. Dominio / allowed origins = URL Render (cuando exista).
3. Claves `pk_live_` / `sk_live_` solo en Render (nunca en el repo).
4. `AUTHORIZED_EMAILS` = correos del despacho.

## 3. Resend

1. Verificar dominio.
2. `FROM_EMAIL` alineado.
3. Primera prueba solo a buzón interno. **No** enviar a clientes reales sin aprobación.

## 4. GitHub

```bash
git checkout -B main
git remote add origin https://github.com/<ORG>/<REPO>.git
git push -u origin main
```

Asegurar que `.env` no esté en el historial (`git check-ignore -v .env`).

## 5. Render

1. New → **Blueprint** → conectar repo → `render.yaml`.
2. O Web Service manual:
   - **Build:** `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start:** `node build/index.js`
   - **Health:** `/api/health`
   - **Node:** 22.x
3. Cargar variables (ver `docs/variables-entorno.md`). `PUBLIC_ORIGIN` y `ORIGIN` = URL del servicio.
4. Auto-deploy desde `main`.
5. Tras el primer deploy exitoso, anotar la URL real.

## 6. Verificación post-deploy

```bash
node scripts/smoke-prod.mjs https://TU-SERVICIO.onrender.com
```

Luego checklist humano: login Google, cliente de prueba, cotización, pago, cobranza, dashboard, móvil, logs Render.

## Comandos útiles

```bash
npm run check:env -- --production
npm run build
npm run db:deploy          # solo con DATABASE_URL apuntando al entorno deseado
npm run db:backup
npm run smoke:prod -- https://…
```
