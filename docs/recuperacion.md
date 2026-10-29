# Respaldo y recuperación — GestorPyme

## Política

- No ejecutar `prisma migrate reset`, `db push --force-reset` ni `DROP` en producción sin autorización explícita por escrito.
- Migraciones forward-only: `npx prisma migrate deploy`.
- Respaldo antes de cualquier cambio de esquema en prod.

## Respaldo

### Opción A — Script local

Requiere `pg_dump` (cliente PostgreSQL) y `DATABASE_URL` apuntando a la DB a respaldar:

```bash
npm run db:backup
```

Salida en `backups/` (ignorada por Git).

### Opción B — Supabase Dashboard

1. Proyecto → **Database** → **Backups** (plan según disponibilidad).
2. O **SQL Editor** / export vía herramientas del panel.

### Opción C — Point-in-time (PITR)

Disponible según plan Supabase. Activar y documentar RPO/RTO del despacho.

## Recuperación

1. Detener o poner en mantenimiento el servicio Render (suspender auto-deploy si hay riesgo).
2. Restaurar dump:

```bash
psql "$DATABASE_URL" -f backups/gestorpyme-YYYY-MM-DD.sql
```

3. Verificar:

```bash
npx prisma migrate status
curl -sS "$PUBLIC_ORIGIN/api/health"
```

4. Smoke: `node scripts/smoke-prod.mjs "$PUBLIC_ORIGIN"`.
5. Login humano + cliente/cotización de prueba.

## Migraciones

| Entorno | Comando |
|---------|---------|
| Local | `npm run db:migrate` (`prisma migrate dev`) |
| CI / Render build | `npx prisma migrate deploy` (ya en `render.yaml`) |

Si `migrate deploy` falla en build, Render no arranca el artefacto nuevo (comportamiento deseable). Revisar logs; **no** forzar `db push` en prod.

## Rollback de aplicación

1. En Render: **Manual Deploy** → commit anterior de `main`.
2. Si el commit nuevo trajo migración irreversible: restaurar DB desde respaldo previo al deploy, luego redeploy del commit estable.

## Contactos / secretos

Rotar `CLERK_SECRET_KEY`, `RESEND_API_KEY` y contraseña de DB si hubo exposición. Actualizar solo en Render env vars; redeploy.
