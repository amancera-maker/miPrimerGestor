-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoCot" AS ENUM ('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'FACTURADA', 'PAGADA');
CREATE TYPE "MetodoPago" AS ENUM ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'TARJETA');
CREATE TYPE "TipoNotificacion" AS ENUM ('COTIZACION_ENVIADA', 'COTIZACION_APROBADA', 'RECORDATORIO_PAGO');
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIANDO', 'ACEPTADA_POR_PROVEEDOR', 'ENTREGADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "empresa" TEXT,
    "rfc" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "telefonoNormalizado" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "nombreClaveActiva" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "estado" "EstadoCot" NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL,
    "vencimiento" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "iva" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "notas" TEXT,
    "facturadaEn" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "creadoPorNombre" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Concepto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Concepto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "creadoPorId" TEXT,
    "creadoPorNombre" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT,
    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistorialCot" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "estadoAnterior" "EstadoCot",
    "estadoNuevo" "EstadoCot" NOT NULL,
    "nota" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorialCot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "proveedorId" TEXT,
    "errorTecnico" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TokenPublico" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEn" TIMESTAMP(3),
    CONSTRAINT "TokenPublico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "cotizacionId" TEXT,
    "respuesta" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContadorCotizacion" (
    "anio" INTEGER NOT NULL,
    "siguiente" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ContadorCotizacion_pkey" PRIMARY KEY ("anio")
);

CREATE TABLE "ConfigDespacho" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nombre" TEXT NOT NULL DEFAULT 'Despacho GestorPyme',
    "rfc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "datosTransferencia" TEXT,
    "logoUrl" TEXT,
    CONSTRAINT "ConfigDespacho_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "Cliente_rfc_key" ON "Cliente"("rfc");
CREATE UNIQUE INDEX "Cliente_nombreClaveActiva_key" ON "Cliente"("nombreClaveActiva");
CREATE INDEX "Cliente_nombreNormalizado_idx" ON "Cliente"("nombreNormalizado");
CREATE INDEX "Cliente_empresa_idx" ON "Cliente"("empresa");
CREATE INDEX "Cliente_activo_idx" ON "Cliente"("activo");
CREATE INDEX "Cliente_creadoEn_idx" ON "Cliente"("creadoEn");

CREATE UNIQUE INDEX "Cotizacion_numero_key" ON "Cotizacion"("numero");
CREATE INDEX "Cotizacion_estado_idx" ON "Cotizacion"("estado");
CREATE INDEX "Cotizacion_fecha_idx" ON "Cotizacion"("fecha");
CREATE INDEX "Cotizacion_clienteId_idx" ON "Cotizacion"("clienteId");
CREATE INDEX "Cotizacion_facturadaEn_idx" ON "Cotizacion"("facturadaEn");

CREATE INDEX "Pago_cotizacionId_idx" ON "Pago"("cotizacionId");
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");
CREATE UNIQUE INDEX "Pago_idempotencyKey_key" ON "Pago"("idempotencyKey");

CREATE INDEX "HistorialCot_cotizacionId_creadoEn_idx" ON "HistorialCot"("cotizacionId", "creadoEn");
CREATE INDEX "Notificacion_cotizacionId_tipo_creadoEn_idx" ON "Notificacion"("cotizacionId", "tipo", "creadoEn");
CREATE INDEX "Notificacion_destinatario_tipo_creadoEn_idx" ON "Notificacion"("destinatario", "tipo", "creadoEn");
CREATE UNIQUE INDEX "TokenPublico_tokenHash_key" ON "TokenPublico"("tokenHash");
CREATE INDEX "TokenPublico_cotizacionId_idx" ON "TokenPublico"("cotizacionId");
CREATE INDEX "TokenPublico_expiraEn_idx" ON "TokenPublico"("expiraEn");
CREATE UNIQUE INDEX "IdempotencyKey_clave_key" ON "IdempotencyKey"("clave");
CREATE INDEX "IdempotencyKey_creadoEn_idx" ON "IdempotencyKey"("creadoEn");

-- FKs
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Concepto" ADD CONSTRAINT "Concepto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialCot" ADD CONSTRAINT "HistorialCot_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TokenPublico" ADD CONSTRAINT "TokenPublico_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ConfigDespacho" ("id", "nombre") VALUES ('default', 'Despacho GestorPyme');
