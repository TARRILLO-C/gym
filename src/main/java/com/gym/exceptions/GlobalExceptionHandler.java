package com.gym.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Manejador global de excepciones.
 * Intercepta las excepciones personalizadas del dominio y las convierte
 * en respuestas JSON estructuradas con el código HTTP apropiado.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404 Not Found ────────────────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // ── 403 Forbidden ────────────────────────────────────────────────────────

    @ExceptionHandler(SuscripcionInactivaException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(SuscripcionInactivaException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    // ── 409 Conflict ─────────────────────────────────────────────────────────

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(DuplicateResourceException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ── 400 Bad Request (validación de @Valid) ────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new java.util.HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(fe -> 
            errores.put(fe.getField(), fe.getDefaultMessage())
        );
        Map<String, Object> body = buildBody(HttpStatus.BAD_REQUEST, "Error de validación");
        body.put("errores", errores);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraint(jakarta.validation.ConstraintViolationException ex) {
        Map<String, String> errores = new java.util.HashMap<>();
        ex.getConstraintViolations().forEach(cv -> 
            errores.put(cv.getPropertyPath().toString(), cv.getMessage())
        );
        Map<String, Object> body = buildBody(HttpStatus.BAD_REQUEST, "Error de validación");
        body.put("errores", errores);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    // ── 500 Internal Server Error ─────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Error interno del servidor: " + ex.getMessage());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String mensaje) {
        return ResponseEntity.status(status).body(buildBody(status, mensaje));
    }

    private Map<String, Object> buildBody(HttpStatus status, String mensaje) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("mensaje", mensaje);
        return body;
    }
}
