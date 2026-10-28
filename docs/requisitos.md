# GestorPyme v1.0 — Requisitos e Historias de Usuario

Fuente: `GestorPyme.pdf` + especificación correctiva del prompt de implementación.
Stack obligatorio: **SvelteKit · Svelte 5 · JavaScript · Tailwind · PostgreSQL/Supabase · Prisma · Clerk · Resend · Chart.js · Zod · Render · Vitest · Playwright**.

## MVP incluido

- Login con Google (Clerk) + protección de rutas/acciones.
- CRUD de clientes (alta, edición, desactivación, perfil).
- Cotizaciones (crear, editar borrador, estados, detalle, historial).
- Pagos (registrar, parciales, eliminar si no PAGADA, saldo automático).
- Cobranza con antigüedad y alertas.
- Correo al pasar a ENVIADA (Resend) + reintento.
- Dashboard con 4 KPIs y gráficas.
- Deploy preparado para Render + migraciones Prisma.

## Fuera de alcance

- Multi-tenant, CFDI/SAT, app nativa, bancos, nómina, chat interno.
- Portal de cliente con login propio (sí hay vista pública por token).

---

## Contradicciones técnicas del PDF (corregidas)

| Tema | PDF | Decisión correctiva |
|------|-----|---------------------|
| Framework | US-001 dice Next.js 14 + TypeScript; criterios dicen `create svelte` | **SvelteKit + JavaScript** |
| Auth | Mezcla Clerk con Auth.js / `/api/auth/[...nextauth]` | **svelte-clerk** (Svelte 5) |
| DB URL | Texto dice Neon; stack dice Supabase | **PostgreSQL vía Supabase** |
| Deploy | Aparece Vercel y Render | **Render + adapter-node** |
| UI | shadcn/ui (React) | **Componentes Svelte propios + Tailwind** |
| Gráficas | Recharts vs Chart.js | **Chart.js** |
| Cantidad conceptos | Schema `Decimal` | **Enteros positivos en MVP** |
| RECHAZADA | US-010: no puede cambiar | Permitir **Reabrir como borrador** con auditoría |
| PAGADA | Botones de transición genéricos | **Solo por pagos que cubren el total** |
| PDF cotización | Fuera de MVP en PDF | Implementar **US-013** post-MVP del prompt |
| Pruebas | “Tests manuales” | **Vitest + Playwright** |

---

## ÉPICA 0 — Setup y autenticación

### US-001 — Inicializar proyecto
**Como** desarrollador **quiero** inicializar GestorPyme con SvelteKit, Prisma, Tailwind y Clerk **para** tener la base lista rápido.

**Criterios:** `create svelte` / scaffold sin errores; Prisma → Supabase; Tailwind aplica; Clerk configurado (sin NextAuth).

### US-002 — Deploy Render
**Como** desarrollador **quiero** deploy automático desde GitHub a Render **para** publicar sin intervención manual.

**Criterios:** `npm run build` OK; env vars; URL pública; push a main redeploy.

### US-003 — Login Google
**Como** socio **quiero** iniciar sesión con Google **para** acceso seguro sin otra contraseña.

**Criterios:** botón Google; OAuth; dashboard con nombre/foto; rutas protegidas; cerrar sesión; **solo usuarios autorizados** (allowlist).

---

## ÉPICA 1 — Clientes

### US-004 — Listar / buscar clientes
Tabla con nombre, empresa, RFC, teléfono, correo, alta; búsqueda; paginación 20; rendimiento con muchos registros.

### US-005 — Registrar cliente
Campos: nombre, empresa, RFC, correo, teléfono, dirección, notas. Validaciones MX (RFC, correo, teléfono). Toast éxito. Anti-doble-clic + idempotencia servidor. Sin duplicados de nombre activo normalizado ni RFC.

### US-006 — Editar cliente
Prellenar; guardar; `actualizadoEn`; mismas validaciones de unicidad.

### US-007 — Perfil cliente
Datos + cotizaciones + total facturado / cobrado / saldo pendiente (MXN). CTA si vacío.

### US-008 — Desactivar / reactivar
No borrar historial; filtro activos/inactivos; no cotizar inactivos.

---

## ÉPICA 2 — Cotizaciones

### US-009 — Crear cotización
Cliente activo (combobox buscable), fechas, número `COT-AAAA-NNN`, conceptos, IVA 16%, totales con Decimal, estado BORRADOR.

### US-010 — Cambiar estados
Flujo: BORRADOR → ENVIADA → APROBADA → FACTURADA. Desde ENVIADA → RECHAZADA. Reabrir RECHAZADA → BORRADOR con motivo. PAGADA solo por pagos. Historial con usuario/motivo. Correo al ENVIADA.

### US-011 — Listar / filtrar
Filtros estado, cliente, fechas; badges de color.

### US-012 — Editar borrador
Solo BORRADOR editable; recalcular totales.

### US-013 — PDF
Ver/descargar PDF profesional generado al vuelo (pdfkit).

---

## ÉPICA 3 — Pagos y cobranza

### US-014 — Registrar pago
Solo APROBADA/FACTURADA; monto ≤ saldo; fecha ≥ emisión; método; parciales; auto PAGADA a saldo 0 en transacción.

### US-015 — Cobranza
APROBADA/FACTURADA con saldo > 0; antigüedad; amarillo 15–30; rojo >30; cartera total.

### US-016 — Eliminar pago
Solo si no PAGADA; confirmación; recalcular.

---

## ÉPICA 4 — Correos

### US-017 — Correo al ENVIADA
HTML Resend; link público con token; separar estado cotización vs notificación; mensaje amigable si falla.

### US-018 — Correo al APROBADA
Template distinto.

### US-019 — Recordatorio cobranza
Manual; confirmación; máx. 1/día por cliente; registro.

---

## ÉPICA 5 — Dashboard y reportes

### US-020 — Dashboard
KPIs: facturado mes (solo facturadas marcadas), cobrado mes (pagos reales), cartera pendiente, cotizaciones activas. Barras 6 meses, dona estados, 5 recientes, 3 mayores saldos. Datos reales, es-MX.

### US-021 — Reportes mensuales
Por cliente: #, total, cobrado, pendiente, %; mes/año; CSV.

---

## Políticas documentadas

### Homónimos de clientes
No se permiten dos clientes **activos** con el mismo nombre completo normalizado (NFC, minúsculas, sin acentos, espacios colapsados). Si existe homónimo legítimo, debe distinguirse en el nombre (p. ej. segundo apellido o alias) o reutilizar el registro existente. RFC único cuando esté presente.

### Cantidades
Enteras en MVP. Servicios por horas fraccionarias requieren unidad configurable futura.

### Facturado vs cobrado
“Facturado” usa marca persistente `facturadaEn` al pasar a FACTURADA (conservada al PAGADA). “Cobrado” suma pagos por `fecha` de pago.
