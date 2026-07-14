package com.gym.controllers;

import com.gym.models.MovimientoCaja;
import com.gym.models.SesionCaja;
import com.gym.services.MovimientoCajaService;
import com.gym.services.SesionCajaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Controller REST para Sesiones de Caja v2.0.
 * Endpoints: /sesiones-caja
 */
@RestController
@RequestMapping("/sesiones-caja")
@RequiredArgsConstructor
public class SesionCajaController {

    private final SesionCajaService sesionService;
    private final MovimientoCajaService movimientoService;

    /** Abre una nueva sesión de turno */
    @PostMapping("/abrir")
    @PreAuthorize("hasAuthority('caja:operar')")
    public ResponseEntity<?> abrirSesion(@RequestBody AbrirRequest req) {
        try {
            SesionCaja sesion = sesionService.abrirSesion(
                    req.getUsername(), req.getMontoInicial(),
                    req.getTurno(), req.getObservaciones());
            return ResponseEntity.status(HttpStatus.CREATED).body(sesion);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Devuelve la sesión actualmente abierta (null si no hay ninguna) */
    @GetMapping("/activa")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<?> obtenerSesionActiva() {
        return sesionService.obtenerSesionActiva()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /** Resumen financiero de la sesión activa (sin revelar montoEsperado) */
    @GetMapping("/activa/resumen")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<?> resumenSesionActiva() {
        try {
            Map<String, Object> resumen = sesionService.obtenerResumenSesionActiva();
            // CIERRE CIEGO: eliminar el montoEsperado antes de enviar al frontend
            resumen.remove("montoEsperadoEfectivo");
            return ResponseEntity.ok(resumen);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cierra la sesión activa. CIERRE CIEGO:
     * El frontend solo envía montoFinalReal. El backend calcula la diferencia.
     */
    @PostMapping("/cerrar")
    @PreAuthorize("hasAuthority('caja:operar')")
    public ResponseEntity<?> cerrarSesion(@RequestBody CerrarRequest req) {
        try {
            SesionCaja cerrada = sesionService.cerrarSesion(
                    req.getSesionId(), req.getMontoFinalReal(),
                    req.getFondoParaSiguiente(), req.getObservaciones());
            return ResponseEntity.ok(cerrada);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Historial de todas las sesiones (para Monitor de Caja) */
    @GetMapping("/historial")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<List<SesionCaja>> listarHistorial() {
        return ResponseEntity.ok(sesionService.listarHistorial());
    }

    /** Datos de la última sesión cerrada (para sugerir fondo al siguiente turno) */
    @GetMapping("/ultima-cerrada")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<Map<String, Object>> ultimaCerrada() {
        return ResponseEntity.ok(sesionService.obtenerUltimaCerrada());
    }

    // ── Movimientos de Caja ───────────────────────────────

    /** Registra un EGRESO (cualquier cajero) */
    @PostMapping("/egresos")
    @PreAuthorize("hasAuthority('caja:operar')")
    public ResponseEntity<?> registrarEgreso(@RequestBody EgresoRequest req) {
        try {
            MovimientoCaja mov = movimientoService.registrarEgreso(
                    req.getDescripcion(), req.getMonto(), req.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(mov);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Registra un RETIRO DE FONDOS (requiere PIN de admin) */
    @PostMapping("/retiros")
    @PreAuthorize("hasAuthority('caja:operar')")
    public ResponseEntity<?> registrarRetiro(@RequestBody RetiroRequest req) {
        try {
            MovimientoCaja mov = movimientoService.registrarRetiro(
                    req.getDescripcion(), req.getMonto(),
                    req.getUsername(), req.getPinAdmin());
            return ResponseEntity.status(HttpStatus.CREATED).body(mov);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Lista movimientos de una sesión específica */
    @GetMapping("/{sesionId}/movimientos")
    @PreAuthorize("hasAuthority('caja:ver')")
    public ResponseEntity<List<MovimientoCaja>> listarMovimientos(@PathVariable Long sesionId) {
        return ResponseEntity.ok(movimientoService.listarPorSesion(sesionId));
    }

    // ── DTOs ─────────────────────────────────────────────

    @Data public static class AbrirRequest {
        private String username;
        private BigDecimal montoInicial;
        private String turno;
        private String observaciones;
    }

    @Data public static class CerrarRequest {
        private Long sesionId;
        private BigDecimal montoFinalReal;
        private BigDecimal fondoParaSiguiente;
        private String observaciones;
    }

    @Data public static class EgresoRequest {
        private String descripcion;
        private BigDecimal monto;
        private String username;
    }

    @Data public static class RetiroRequest {
        private String descripcion;
        private BigDecimal monto;
        private String username;
        private String pinAdmin;
    }
}
