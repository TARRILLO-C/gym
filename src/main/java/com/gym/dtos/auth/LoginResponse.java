package com.gym.dtos.auth;

import java.util.List;

/**
 * DTO para la respuesta de inicio de sesión utilizando Java 21 records.
 */
public record LoginResponse(
    String token,
    UsuarioDTO usuario,
    String rol,
    List<String> permisos
) {}
