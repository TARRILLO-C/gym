package com.gym.controllers;

import com.gym.models.Congelamiento;
import com.gym.models.Suscripcion;
import com.gym.services.SuscripcionService;
import com.gym.dtos.SuscripcionRequest;
import com.gym.dtos.CongelamientoRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<org.springframework.data.domain.Page<Suscripcion>> listarTodas(
            @org.springframework.data.web.PageableDefault(size = 10, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(suscripcionService.listarTodas(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<Suscripcion> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(suscripcionService.buscarPorId(id));
    }

    @GetMapping("/socio/{socioId}")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<List<Suscripcion>> listarPorSocio(@PathVariable Long socioId) {
        return ResponseEntity.ok(suscripcionService.listarPorSocio(socioId));
    }

    @GetMapping("/vencen-esta-semana")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<List<Suscripcion>> listarVencenEstaSemana() {
        return ResponseEntity.ok(suscripcionService.listarVencenEstaSemana());
    }

    @GetMapping("/vencidas")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<List<Suscripcion>> listarVencidas() {
        return ResponseEntity.ok(suscripcionService.listarVencidas());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('socios:crear')")
    public ResponseEntity<Suscripcion> crear(@Valid @RequestBody SuscripcionRequest request) {
        Suscripcion nueva = suscripcionService.crear(
                request.socioId(),
                request.membresiaId(),
                request.fechaInicio() != null ? request.fechaInicio() : LocalDate.now(),
                request.estadoPago(),
                request.pagoTotal(),
                request.generarComprobante(),
                request.tipoComprobante(),
                request.clienteNombre(),
                request.clienteDocumento(),
                request.metodoPago()
        );
        return new ResponseEntity<>(nueva, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/renovar")
    @PreAuthorize("hasAuthority('socios:crear')")
    public ResponseEntity<Suscripcion> renovar(@PathVariable Long id) {
        return ResponseEntity.ok(suscripcionService.renovar(id));
    }

    @PostMapping("/{id}/congelar")
    @PreAuthorize("hasAuthority('socios:editar')")
    public ResponseEntity<Congelamiento> congelar(@PathVariable Long id, @Valid @RequestBody CongelamientoRequest request) {
        return ResponseEntity.ok(suscripcionService.congelar(id, request.fechaInicio(), request.fechaFin(), request.motivo()));
    }

    @PostMapping("/{id}/descongelar")
    @PreAuthorize("hasAuthority('socios:editar')")
    public ResponseEntity<Void> descongelar(@PathVariable Long id) {
        suscripcionService.descongelar(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/restaurar")
    @PreAuthorize("hasAuthority('socios:editar')")
    public ResponseEntity<Void> restaurar(@PathVariable Long id) {
        suscripcionService.restaurar(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('socios:eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        suscripcionService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
