package com.gym.controllers;

import com.gym.models.CierreCaja;
import com.gym.services.CierreCajaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cierre-caja")
@RequiredArgsConstructor
public class CierreCajaController {

    private final CierreCajaService cierreCajaService;

    @PostMapping("/abrir")
    public ResponseEntity<CierreCaja> abrirCaja(@RequestBody AbrirRequest request) {
        try {
            CierreCaja cierre = cierreCajaService.abrirCaja(
                    request.getUsername(),
                    request.getMontoInicial(),
                    request.getObservaciones());
            return ResponseEntity.ok(cierre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/hoy")
    public ResponseEntity<CierreCaja> obtenerCierreDelDia() {
        CierreCaja cierre = cierreCajaService.obtenerCierreDelDia();
        if (cierre == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(cierre);
    }

    @GetMapping("/resumen")
    public ResponseEntity<Map<String, Object>> obtenerResumen(
            @RequestParam(required = false) String fecha) {
        LocalDate fechaConsulta = (fecha != null) ? LocalDate.parse(fecha) : LocalDate.now();
        return ResponseEntity.ok(cierreCajaService.obtenerResumenCaja(fechaConsulta));
    }

    @PostMapping("/cerrar")
    public ResponseEntity<CierreCaja> cerrarCaja(@RequestBody CerrarRequest request) {
        try {
            CierreCaja cierre = cierreCajaService.cerrarCaja(
                    request.getCierreId(),
                    request.getMontoFinalReal(),
                    request.getObservaciones());
            return ResponseEntity.ok(cierre);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/historial")
    public ResponseEntity<List<CierreCaja>> listarHistorial() {
        return ResponseEntity.ok(cierreCajaService.listarHistorial());
    }

    @Data
    public static class AbrirRequest {
        private String username;
        private BigDecimal montoInicial;
        private String observaciones;
    }

    @Data
    public static class CerrarRequest {
        private Long cierreId;
        private BigDecimal montoFinalReal;
        private String observaciones;
    }
}
