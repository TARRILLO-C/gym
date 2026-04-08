package com.gym.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Excepción lanzada cuando un socio no posee una suscripción vigente.
 * Produce un HTTP 403 Forbidden al intentar registrar asistencia.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class SuscripcionInactivaException extends RuntimeException {

    public SuscripcionInactivaException(String mensaje) {
        super(mensaje);
    }
}
