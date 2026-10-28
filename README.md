# GestorPyme v1.0

Aplicación web SaaS (un despacho por despliegue) para gestionar **clientes, cotizaciones, pagos, cobranza y reportes** de un despacho mexicano.

## Stack

- SvelteKit 2 + Svelte 5 (JavaScript)
- Tailwind CSS 4
- PostgreSQL (Supabase) + Prisma 6
- Clerk (`svelte-clerk`) — Google OAuth
- Resend — correos transaccionales
- Chart.js — dashboard
- Vitest + Playwright
- Render (`adapter-node`)

## Requisitos previos

- Node.js 22+
- Cuenta [Supabase](https://supabase.com) (PostgreSQL)
- Cuenta [Clerk](https://clerk.com) con Google OAuth
- Cuenta [Resend](https://resend.com) (opcional en desarrollo)

## Configuración rápida

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### Variables mínimas

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Cadena PostgreSQL de Supabase |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública Clerk |
| `CLERK_SECRET_KEY` | Clave secreta Clerk |
| `AUTHORIZED_EMAILS` | Correos permitidos (coma) |
| `PUBLIC_ORIGIN` | URL pública sin slash final |
| `RESEND_API_KEY` / `FROM_EMAIL` | Correos |
| `DEV_BYPASS_AUTH=true` | Solo desarrollo local sin Clerk |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build producción |
| `npm start` | Ejecuta `build/` (Render) |
| `npm run test:unit` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:studio` | Prisma Studio |

## Módulos

- `/login` — autenticación
- `/dashboard` — KPIs y gráficas
- `/clientes` — CRUD + perfil
- `/cotizaciones` — ciclo de vida + PDF
- `/cobranza` — cartera pendiente + recordatorios
- `/reportes` — resumen mensual + CSV
- `/publico/cotizacion/[token]` — vista segura para el cliente

## Despliegue en Render

1. Web Service desde el repo GitHub.
2. Build: `npm install && npx prisma generate && npm run build`
3. Start: `node build`
4. Configurar variables de entorno del panel.
5. Ejecutar `npx prisma migrate deploy` (release command o one-off).

## Documentación

- `docs/requisitos.md` — US-001 a US-021
- `docs/progreso.md` — avances
- `docs/pruebas.md` — casos y resultados
- `AGENTS.md` — reglas para agentes IA

## Licencia

Uso académico / interno del despacho.
