# Auditoría final GestorPyme v1.0

Fecha: 2026-10-29  
Auditor: suite automatizada (Vitest + Playwright + HTTP) sobre base aislada `gestorpyme_test`.  
Regla: **no se inventan resultados**. Solo evidencia ejecutada.

## Resumen ejecutivo

| Suite | Resultado |
|-------|-----------|
| Vitest (unit + integración) | **50/50 passed** |
| Playwright (smoke + UI + responsive) | **55/55 passed** |
| HTTP sin sesión (`tests/audit-seguridad-http.mjs`) | **4/4 rutas → 303 /login** |
| Build producción | **OK** |

## Defectos encontrados y corregidos

| ID | Defecto | Causa | Corrección | Evidencia |
|----|---------|-------|------------|-----------|
| BUG-01 | Pagos concurrentes podían aceptar montos que juntos excedían el saldo | Lectura de saldo sin bloqueo de fila | `SELECT … FOR UPDATE` en `pagos.js` | AUD-P3 concurrentes OK |
| BUG-02 | Idempotencia de clientes débil bajo carrera | Key creada después del insert | Reserva de `IdempotencyKey` primero en `clientes.js` | AUD-P1-05/06 OK |
| BUG-03 | Historial de correo decía “enviada al cliente” tras aceptación del proveedor | Texto confuso ACEPTADA≠ENTREGADA | Mensajes corregidos en `email.js` + mailer inyectable | AUD-P6 OK |
| BUG-04 | Dashboard generaba scroll horizontal en 320px | KPI/gráficas sin `min-w-0` / overflow | CSS + layout dashboard/AppShell | AUD-P8 320 dashboard OK |
| BUG-05 | Serialización Decimal rompía `/cotizaciones` (sesión previa) | Prisma Decimal no POJO | `serialize.js` (ya aplicado) | Rutas e2e OK |

## Tabla de pruebas

| ID | Funcionalidad | Esperado | Real | Estado | Archivo / evidencia |
|----|---------------|----------|------|--------|---------------------|
| AUD-P1-01 | Teléfono `hola123` | Rechazo | Rechazo por letras | **Aprobado** | `tests/audit-clientes.integration.test.js` |
| AUD-P1-02 | Duplicado Juan Pérez | Bloqueo | Bloqueo | **Aprobado** | idem |
| AUD-P1-03 | Normalización ` JUAN PÉREZ ` / `juan perez` | Equivalencia | Equivalencia | **Aprobado** | idem |
| AUD-P1-04 | Editar hacia nombre duplicado | Rechazo | Rechazo | **Aprobado** | idem |
| AUD-P1-05 | Triple envío misma idempotencyKey | 1 registro | 1 registro | **Aprobado** | idem |
| AUD-P1-06 | 3 creates simultáneos mismo nombre | 1 OK + 2 fail | Cumple | **Aprobado** | idem |
| AUD-P1-07 | Desactivar / reactivar | Estados correctos | OK | **Aprobado** | idem |
| AUD-P1-08 | Cotizar inactivo | Rechazo | Rechazo | **Aprobado** | idem |
| AUD-P1-09 | Paginación 20 + búsqueda | Página 20, filtros | OK | **Aprobado** | idem |
| AUD-P2-01 | Sin fecha emisión | Rechazo | Rechazo | **Aprobado** | `tests/audit-cotizaciones.integration.test.js` |
| AUD-P2-02 | Sin vencimiento | Rechazo | Rechazo | **Aprobado** | idem |
| AUD-P2-03 | Vencimiento < emisión | Rechazo | Rechazo | **Aprobado** | idem |
| AUD-P2-04 | Concepto sin descripción | Error claro | Error | **Aprobado** | idem |
| AUD-P2-05 | Cantidad 1.37 | Rechazo entero | Rechazo | **Aprobado** | idem |
| AUD-P2-06 | Cantidad -2/0/texto; precio neg. | Rechazo | Rechazo | **Aprobado** | idem |
| AUD-P2-07 | Totales 2500/400/2900 | Exactos | Exactos | **Aprobado** | idem |
| AUD-P2-08 | Numeración concurrente | Únicos | 3 únicos | **Aprobado** | idem |
| AUD-P2-09 | Editar borrador; bloquear ENVIADA | OK / bloqueo | OK | **Aprobado** | idem |
| AUD-P2-10 | Reabrir RECHAZADA con motivo | Motivo + historial | OK | **Aprobado** | idem |
| AUD-P2-11 | PAGADA sin pagos | Imposible | Bloqueado | **Aprobado** | idem |
| AUD-P2-12 | Fallo correo + ENVIADA | Aviso amigable, FALLIDA | OK | **Aprobado** | idem |
| AUD-P3 | Pagos parcial/total/rechazos/estados | Coherente | OK | **Aprobado** | `tests/audit-pagos-cobranza.integration.test.js` |
| AUD-P3-C | 3 pagos concurrentes 1900 | No exceden 2900 | OK | **Aprobado** | idem |
| AUD-P4 | Cobranza aparece/desaparece/filtros | Reglas estado+saldo | OK | **Aprobado** | idem |
| AUD-P4-R | Alerta roja >30 días | `alerta=roja` | OK | **Aprobado** | idem |
| AUD-P5 | Facturado solo con `facturadaEn` | BORRADOR/ENVIADA/APROBADA no suman | OK | **Aprobado** | idem |
| AUD-P5-L | APROBADA liquidada sin FACTURADA | Cobrado sí, facturado no | OK | **Aprobado** | idem |
| AUD-P6 | Mailer mock fallo/reintento | Mensaje público, log privado, ACEPTADA≠ENTREGADA | OK | **Aprobado** | `tests/audit-email.integration.test.js` |
| AUD-P7 | 5000 clientes búsqueda paginada | ≤20 por página, <2s listado | OK | **Aprobado** | `tests/audit-rendimiento.integration.test.js` |
| AUD-P8 | Responsive 320–1440 (rutas+modal) | Sin scroll H global; modales dentro | **55 e2e OK** tras fix | **Aprobado** | `e2e/audit-responsive.spec.js` + capturas `test-results/responsive/` |
| AUD-P9-S | Pagos/PAGADA/edición/token/duplicados | Rechazo servidor | OK | **Aprobado** | `tests/audit-seguridad.integration.test.js` |
| AUD-P9-H | `/dashboard|/clientes|/cotizaciones|/cobranza` sin sesión | Redirect login | 303 `/login` | **Aprobado** | `tests/audit-seguridad-http.mjs` |
| AUD-U | Combobox + form 375 | Usable | OK | **Aprobado** | `e2e/audit-ui-flows.spec.js` |
| Unit | money/normalize/validators | Pass | 15 OK | **Aprobado** | `src/lib/server/*.test.js` |

## No verificado / externo pendiente

| Ítem | Motivo |
|------|--------|
| Clerk Google OAuth real | Sin claves de producción |
| Resend entrega real a buzón | Solo mailer mock; no enviar a clientes reales |
| Supabase cloud | Auditoría usó Postgres local `gestorpyme_test` |
| Deploy Render | No desplegado en esta auditoría |
| Responsive visual pixel-perfect de tablas densas | Capturas tomadas; scroll H global verificado; revisión humana de capturas recomendada |

## Cómo reproducir

```bash
# Base aislada
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/gestorpyme_test
npx prisma migrate deploy
npm run test:unit          # incluye integración audit
npx playwright test
node tests/audit-seguridad-http.mjs   # requiere build previo
```

Scripts útiles añadidos en `package.json` (recomendado):

- `npm run test:audit` → vitest de `tests/audit-*.test.js`
- `npm run test:e2e` → Playwright

## Conclusión

Los fallos **reproducibles** dentro del alcance técnico (concurrencia financiera, idempotencia, mensajes de correo, overflow 320px, protección de rutas sin sesión) fueron **corregidos y revalidados**.  
La aplicación supera la batería de auditoría automatizada actual. Queda fuera: OAuth/Resend reales y despliegue cloud.
