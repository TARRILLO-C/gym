-- Estructura SQL generada para gym_db

CREATE TABLE `socios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dni` varchar(8) NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `nombre_completo` varchar(150) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `asistencias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_hora_ingreso` datetime(6) NOT NULL,
  `socio_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_asistencia_socio` (`socio_id`),
  CONSTRAINT `FK_asistencia_socio` FOREIGN KEY (`socio_id`) REFERENCES `socios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `membresias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(255) DEFAULT NULL,
  `duracion_dias` int NOT NULL,
  `estado` enum('DISPONIBLE','OCULTO') NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `precio_mensual` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_membresia_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `suscripciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `esta_congelada` bit(1) NOT NULL,
  `estado_pago` enum('PAGADO','PENDIENTE','VENCIDO') NOT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_proximo_cobro` date DEFAULT NULL,
  `membresia_id` bigint NOT NULL,
  `socio_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_suscripcion_membresia` (`membresia_id`),
  KEY `FK_suscripcion_socio` (`socio_id`),
  CONSTRAINT `FK_suscripcion_socio` FOREIGN KEY (`socio_id`) REFERENCES `socios` (`id`),
  CONSTRAINT `FK_suscripcion_membresia` FOREIGN KEY (`membresia_id`) REFERENCES `membresias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `congelamientos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_fin` date NOT NULL,
  `fecha_inicio` date NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `suscripcion_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_congelamiento_suscripcion` (`suscripcion_id`),
  CONSTRAINT `FK_congelamiento_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `pagos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comentario` varchar(255) DEFAULT NULL,
  `fecha_pago` datetime(6) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TARJETA','TRANSFERENCIA','YAPE_PLIN') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `suscripcion_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_pago_suscripcion` (`suscripcion_id`),
  CONSTRAINT `FK_pago_suscripcion` FOREIGN KEY (`suscripcion_id`) REFERENCES `suscripciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `productos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `categoria` enum('BEBIDA','SUPLEMENTO','ACCESORIO','ROPA','OTRO') DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `ventas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha` datetime(6) NOT NULL,
  `metodo_pago` enum('EFECTIVO','TARJETA','TRANSFERENCIA','YAPE_PLIN') NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `socio_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_venta_socio` (`socio_id`),
  CONSTRAINT `FK_venta_socio` FOREIGN KEY (`socio_id`) REFERENCES `socios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `detalle_ventas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `producto_id` bigint NOT NULL,
  `venta_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_detalle_producto` (`producto_id`),
  KEY `FK_detalle_venta` (`venta_id`),
  CONSTRAINT `FK_detalle_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`),
  CONSTRAINT `FK_detalle_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
