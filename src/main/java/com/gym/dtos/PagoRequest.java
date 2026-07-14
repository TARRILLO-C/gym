package com.gym.dtos;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para el registro de pagos sobre suscripciones existentes.
 * Diseñado como Record en Java 21. No incluye el campo 'monto' para evitar manipulación de precios.
 */
public record PagoRequest(
    @NotBlank(message = "El método de pago es obligatorio")
    String metodoPago,
    
    String comentario,
    Boolean generarComprobante,
    String tipoComprobante,
    String clienteNombre,
    String clienteDocumento
) {}
