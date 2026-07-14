package com.gym.dtos;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

/**
 * DTO para la solicitud de congelamiento de una membresía.
 * Implementado como Record de Java 21.
 */
public record CongelamientoRequest(
    LocalDate fechaInicio,
    LocalDate fechaFin,
    
    @NotBlank(message = "El motivo del congelamiento es obligatorio")
    String motivo
) {}
