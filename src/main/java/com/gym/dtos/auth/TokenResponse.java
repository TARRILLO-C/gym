package com.gym.dtos.auth;

/**
 * DTO para la envoltura estándar de tokens utilizando Java 21 records.
 */
public record TokenResponse(
    String token,
    String type
) {
    public TokenResponse(String token) {
        this(token, "Bearer");
    }
}
