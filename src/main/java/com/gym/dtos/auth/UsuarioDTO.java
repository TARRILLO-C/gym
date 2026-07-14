package com.gym.dtos.auth;

/**
 * DTO para representar los datos básicos de un usuario utilizando Java 21 records.
 */
public record UsuarioDTO(
    Long id,
    String username,
    String rol
) {}
