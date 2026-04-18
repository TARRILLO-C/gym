package com.gym.controllers;

import com.gym.models.Congelamiento;
import com.gym.models.Suscripcion;
import com.gym.services.SuscripcionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import jakarta.validation.Valid;

/**
 * Controlador REST para la gestión de Suscripciones de socios.
 */
@RestController
@RequestMapping("/suscripciones")
@RequiredArgsConstructor
public class SuscripcionController {

    private final SuscripcionService suscripcionService;

    @GetMapping
    public ResponseEntity<List<Suscripcion>> listarTodas() {
        return ResponseEntity.ok(suscripcionService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Suscripcion> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(suscripcionService.buscarPorId(id));
    }

    @GetMapping("/socio/{socioId}")
    public ResponseEntity<List<Suscripcion>> listarPorSocio(@PathVariable Long socioId) {
        return ResponseEntity.ok(suscripcionService.listarPorSocio(socioId));
    }

    @GetMapping("/vencen-esta-semana")
    public ResponseEntity<List<Suscripcion>> listarVencenEstaSemana() {
        return ResponseEntity.ok(suscripcionService.listarVencenEstaSemana());
    }

    @GetMapping("/vencidas")
    public ResponseEntity<List<Suscripcion>> listarVencidas() {
        return ResponseEntity.ok(suscripcionService.listarVencidas());
    }

    @PostMapping
    public ResponseEntity<Suscripcion> crear(@Valid @RequestBody SuscripcionRequest request) {
        Suscripcion nueva = suscripcionService.crear(
                request.getSocioId(),
                request.getMembresiaId(),
                request.getFechaInicio() != null ? request.getFechaInicio() : LocalDate.now(),
                request.getEstadoPago(),
                request.getPagoTotal()
        );
        return new ResponseEntity<>(nueva, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/renovar")
    public ResponseEntity<Suscripcion> renovar(@PathVariable Long id) {
        return ResponseEntity.ok(suscripcionService.renovar(id));
    }

    @PostMapping("/{id}/congelar")
    public ResponseEntity<Congelamiento> congelar(@PathVariable Long id, @Valid @RequestBody CongelamientoRequest request) {
        return ResponseEntity.ok(suscripcionService.congelar(id, request.getFechaInicio(), request.getFechaFin(), request.getMotivo()));
    }

    @PostMapping("/{id}/descongelar")
    public ResponseEntity<Void> descongelar(@PathVariable Long id) {
        suscripcionService.descongelar(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<Void> restaurar(@PathVariable Long id) {
        suscripcionService.restaurar(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        suscripcionService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DTO interno para recibir la solicitud de creación de suscripción.
     */
    @Data
    public static class SuscripcionRequest {
        private Long socioId;
        private Long membresiaId;
        private LocalDate fechaInicio;
        private Suscripcion.EstadoPago estadoPago;
        private Boolean pagoTotal;
    }

    @Data
    public static class CongelamientoRequest {
        private LocalDate fechaInicio;
        private LocalDate fechaFin;
        private String motivo;
    }
}
