package com.gym.dtos;

import com.gym.models.Suscripcion;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * DTO para la creación de una nueva suscripción.
 * Implementado como Record de Java 21 para inmutabilidad y legibilidad.
 */
public record SuscripcionRequest(
    @NotNull(message = "El ID del socio es obligatorio")
    Long socioId,
    
    @NotNull(message = "El ID de la membresía es obligatorio")
    Long membresiaId,
    
    LocalDate fechaInicio,
    
    Suscripcion.EstadoPago estadoPago,
    
    Boolean pagoTotal,
    
    Boolean generarComprobante,
    
    String tipoComprobante,
    
    String clienteNombre,
    
    String clienteDocumento,
    
    String metodoPago
) {}
