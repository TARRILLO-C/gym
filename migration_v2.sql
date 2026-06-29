-- ===========================================================================
-- MIGRACIÓN v2.0 — The Jungle Cash Register System
-- Ejecutar en orden. Hacer BACKUP antes.
-- ===========================================================================

-- 1. Renombrar tabla antigua (preservar historial)
RENAME TABLE `cierres_caja` TO `cierres_caja_backup`;

-- 2. Nueva tabla sesiones_caja (múltiples turnos por día)
CREATE TABLE `sesiones_caja` (
  `id`                   BIGINT        NOT NULL AUTO_INCREMENT,
  `turno`                VARCHAR(50)   NOT NULL DEFAULT 'General',
  `username`             VARCHAR(100)  NOT NULL,
  `apertura_at`          DATETIME      NOT NULL,
  `cierre_at`            DATETIME      NULL,
  `monto_inicial`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `monto_final_esperado` DECIMAL(10,2) NULL,
  `monto_final_real`     DECIMAL(10,2) NULL,
  `diferencia`           DECIMAL(10,2) NULL,
  `fondo_para_siguiente` DECIMAL(10,2) NULL DEFAULT 0.00,
  `estado`               ENUM('ABIERTA','CUADRADA','FALTANTE','SOBRANTE') NOT NULL DEFAULT 'ABIERTA',
  `observaciones`        VARCHAR(500)  NULL,
  `resumen_json`         TEXT          NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrar datos históricos de cierres_caja_backup a sesiones_caja
INSERT INTO `sesiones_caja`
  (turno, username, apertura_at, cierre_at, monto_inicial,
   monto_final_esperado, monto_final_real, diferencia,
   fondo_para_siguiente, estado, observaciones, resumen_json)
SELECT
  'General',
  username,
  COALESCE(created_at, CONCAT(fecha, ' 08:00:00')),
  closed_at,
  COALESCE(monto_inicial, 0),
  monto_final_esperado,
  monto_final_real,
  diferencia,
  0.00,
  CASE
    WHEN estado = 'ABIERTO' THEN 'ABIERTA'
    WHEN estado = 'DIFERENCIA' THEN 'FALTANTE'
    ELSE 'CUADRADA'
  END,
  observaciones,
  resumen_json
FROM `cierres_caja_backup`;

-- 3. Agregar columnas nuevas a `ventas`
ALTER TABLE `ventas`
  ADD COLUMN `sesion_id`        BIGINT       NULL      AFTER `id`,
  ADD COLUMN `total_efectivo`   DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `total`,
  ADD COLUMN `anulado_por`      VARCHAR(100) NULL      AFTER `activo`,
  ADD COLUMN `anulado_at`       DATETIME     NULL      AFTER `anulado_por`,
  ADD CONSTRAINT `FK_venta_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesiones_caja` (`id`);

-- Rellenar total_efectivo en ventas existentes con método EFECTIVO
UPDATE `ventas` SET `total_efectivo` = `total` WHERE `metodo_pago` = 'EFECTIVO';

-- 4. Nueva tabla pagos_venta (pagos mixtos por comprobante)
CREATE TABLE `pagos_venta` (
  `id`          BIGINT        NOT NULL AUTO_INCREMENT,
  `venta_id`    BIGINT        NOT NULL,
  `metodo_pago` ENUM('EFECTIVO','TARJETA','TRANSFERENCIA','YAPE_PLIN') NOT NULL,
  `monto`       DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_pv_venta` (`venta_id`),
  CONSTRAINT `FK_pv_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrar ventas existentes: cada venta antigua genera un único pago_venta
INSERT INTO `pagos_venta` (`venta_id`, `metodo_pago`, `monto`)
SELECT `id`, `metodo_pago`, `total` FROM `ventas` WHERE `metodo_pago` IS NOT NULL;

-- 5. Nueva tabla movimientos_caja (reemplaza a egresos)
CREATE TABLE `movimientos_caja` (
  `id`             BIGINT        NOT NULL AUTO_INCREMENT,
  `sesion_id`      BIGINT        NOT NULL,
  `tipo`           ENUM('EGRESO','RETIRO_FONDOS') NOT NULL,
  `descripcion`    VARCHAR(255)  NOT NULL,
  `monto`          DECIMAL(10,2) NOT NULL,
  `username`       VARCHAR(100)  NOT NULL,
  `autorizado_por` VARCHAR(100)  NULL,
  `fecha`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_mov_sesion` (`sesion_id`),
  CONSTRAINT `FK_mov_sesion` FOREIGN KEY (`sesion_id`) REFERENCES `sesiones_caja` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migrar egresos existentes (si tiene la tabla)
-- INSERT INTO movimientos_caja (sesion_id, tipo, descripcion, monto, username, fecha)
-- SELECT 1, 'EGRESO', descripcion, monto, username, fecha FROM egresos;
-- (Descomentar si corresponde y ajustar sesion_id)

-- 6. Nueva tabla log_anulaciones (auditoría inmutable)
CREATE TABLE `log_anulaciones` (
  `id`                      BIGINT        NOT NULL AUTO_INCREMENT,
  `venta_id`                BIGINT        NOT NULL,
  `sesion_id`               BIGINT        NULL,
  `motivo`                  VARCHAR(500)  NOT NULL,
  `anulado_por`             VARCHAR(100)  NOT NULL,
  `monto_devuelto_efectivo` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `fecha`                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `FK_log_venta` (`venta_id`),
  CONSTRAINT `FK_log_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Agregar pin_admin a usuarios (para validar anulaciones y retiros)
ALTER TABLE `usuarios`
  ADD COLUMN `pin_admin` VARCHAR(64) NULL COMMENT 'PIN hasheado para operaciones sensibles';
