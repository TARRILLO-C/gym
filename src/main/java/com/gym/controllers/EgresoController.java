package com.gym.controllers;

import com.gym.models.Egreso;
import com.gym.services.EgresoService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/egresos")
@RequiredArgsConstructor
public class EgresoController {

    private final EgresoService egresoService;

    @PostMapping
    @PreAuthorize("hasAuthority('caja:operar')")
    public ResponseEntity<?> registrarEgreso(@RequestBody EgresoRequest request) {
        try {
            Egreso egreso = egresoService.registrarEgreso(
                    request.getDescripcion(),
                    request.getMonto(),
                    request.getUsername()
            );
            return ResponseEntity.ok(egreso);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Error interno al registrar egreso."));
        }
    }

    @GetMapping("/hoy")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<List<Egreso>> obtenerEgresosDeHoy() {
        return ResponseEntity.ok(egresoService.obtenerEgresosDeHoy());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<List<Egreso>> obtenerEgresosPorFecha(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(egresoService.obtenerEgresosPorFecha(fecha));
    }

    @Data
    public static class EgresoRequest {
        private String descripcion;
        private BigDecimal monto;
        private String username;
    }
}
