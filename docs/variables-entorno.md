# Variables de entorno — GestorPyme

Plantilla versionada: `.env.example`. Secretos reales: solo en `.env` local o en el panel de Render. **Nunca** en Git.

## Tabla

| Variable | Ámbito | Obligatoria prod | Descripción |
|----------|--------|------------------|-------------|
| `DATABASE_URL` | privada | Sí | PostgreSQL (Supabase). Incluir `sslmode=require`. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | pública | Sí | `pk_live_…` en producción. |
| `CLERK_SECRET_KEY` | privada | Sí | `sk_live_…` en producción. |
| `AUTHORIZED_EMAILS` | privada | Sí | Allowlist coma-separada. |
| `PUBLIC_ORIGIN` | pública | Sí | URL canónica sin slash final. |
| `ORIGIN` | privada (adapter-node) | Sí (recomendada) | Mismo valor que `PUBLIC_ORIGIN` (CSRF). |
| `RESEND_API_KEY` | privada | Sí si se envían correos | Clave Resend. |
| `FROM_EMAIL` | privada | Sí si se envían correos | Remitente verificado. |
| `NODE_ENV` | runtime | `production` en Render | Controla bypass y logs. |
| `DEV_BYPASS_AUTH` | privada | **Prohibida** en prod | Solo local; ignorada si `NODE_ENV=production`. |
| `DESPACHO_*` | privada | No | Datos de marca en PDF/correos. |
| `NODE_VERSION` | Render | Sí | `22.12.0` (ver `render.yaml`). |

## Desarrollo vs producción

| | Desarrollo | Producción (Render) |
|--|------------|---------------------|
| Auth | Clerk test o `DEV_BYPASS_AUTH=true` | Solo Clerk live; bypass desactivado por código |
| DB | Postgres local / proyecto Supabase dev | Proyecto Supabase prod + SSL |
| Correos | Mock / Resend sandbox | Dominio verificado; no spam a clientes |
| Origin | `http://localhost:5173` | URL `*.onrender.com` o dominio custom |

## Preflight local

```bash
node scripts/check-env.mjs
node scripts/check-env.mjs --production
```

No imprime valores de secretos.

## Clerk — URLs a configurar en el dashboard

Tras conocer la URL de Render (ejemplo `https://gestorpyme.onrender.com`):

1. **Allowed origins / domains:** la URL pública.
2. **Sign-in / Sign-up redirect:** `https://…/dashboard` (o la que use svelte-clerk).
3. **OAuth Google:** habilitado; redirect URIs del propio Clerk.
4. **Authorized parties:** dominio de la app.

## Resend

1. Verificar dominio DNS (SPF/DKIM).
2. `FROM_EMAIL` debe usar ese dominio.
3. Primera prueba solo a un buzón del despacho.
