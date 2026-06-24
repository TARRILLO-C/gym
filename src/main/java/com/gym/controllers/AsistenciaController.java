package com.gym.controllers;

import com.gym.models.Asistencia;
import com.gym.services.AsistenciaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;

/**
 * Controlador REST para el control de acceso y registro de asistencias.
 */
@RestController
@RequestMapping("/asistencias")
@RequiredArgsConstructor
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    /**
     * Registra el ingreso de un socio validando su DNI y su suscripción activa.
     * Retorna 200 OK si es válido, 403 Forbidden si la suscripción está vencida o inactiva,
     * o 404 Not Found si el DNI no existe.
     *
     * @param request Mapa que contiene el "dni" del socio.
     */
    @PostMapping("/registrar-ingreso")
    public ResponseEntity<?> registrarIngreso(@Valid @RequestBody Map<String, String> request) {
        String dni = request.get("dni");
        if (dni == null || dni.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El DNI es obligatorio."));
        }
        if (dni.length() != 8 || !dni.matches("\\d{8}")) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El DNI debe tener exactamente 8 dígitos numéricos."));
        }
        return ResponseEntity.ok(asistenciaService.registrarIngresoPorDni(dni));
    }

    @GetMapping
    public ResponseEntity<List<Asistencia>> listarTodas() {
        return ResponseEntity.ok(asistenciaService.listarTodas());
    }

    @GetMapping("/hoy")
    public ResponseEntity<List<Asistencia>> listarDeHoy() {
        return ResponseEntity.ok(asistenciaService.listarDeHoy());
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Asistencia>> buscar(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta) {
        LocalDateTime desde = fechaDesde != null ? fechaDesde.atStartOfDay() : null;
        LocalDateTime hasta = fechaHasta != null ? fechaHasta.atTime(LocalTime.MAX) : null;
        return ResponseEntity.ok(asistenciaService.buscar(search, desde, hasta));
    }
}
