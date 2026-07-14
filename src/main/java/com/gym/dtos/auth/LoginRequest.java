package com.gym.dtos.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO para la petición de inicio de sesión utilizando Java 21 records.
 */
public record LoginRequest(
    @NotBlank(message = "El nombre de usuario es obligatorio")
    String username,
    
    @NotBlank(message = "La contraseña es obligatoria")
    String password
) {}
