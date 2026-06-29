package com.gym.controllers;

import com.gym.models.DetalleVenta;
import com.gym.models.PagoVenta;
import com.gym.models.Venta;
import com.gym.services.VentaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import com.gym.validators.ValidSunatDocument;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para el Punto de Venta v2.0.
 * Soporta: pagos mixtos (Feature 4) y anulación con PIN (Feature 2).
 */
@RestController
@RequestMapping("/ventas")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;

    @GetMapping
    public ResponseEntity<List<Venta>> listarTodas() {
        return ResponseEntity.ok(ventaService.listarTodas());
    }

    @GetMapping("/productos")
    public ResponseEntity<List<Venta>> listarVentasProductos() {
        return ResponseEntity.ok(ventaService.listarVentasProductos());
    }

    /** Registra una nueva venta con soporte de pagos mixtos */
    @PostMapping
    public ResponseEntity<?> registrarVenta(@Valid @RequestBody VentaRequest request) {
        try {
            Venta nueva = ventaService.registrarVenta(
                    request.getSocioId(),
                    request.getPagos(),
                    request.getDetalles(),
                    request.getTipoComprobante(),
                    request.getClienteNombre(),
                    request.getClienteDocumento(),
                    false
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(nueva);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Anula un comprobante. NUNCA se llama "Eliminar".
     * Requiere PIN de administrador obligatoriamente.
     */
    @PostMapping("/{id}/anular")
    public ResponseEntity<?> anularComprobante(@PathVariable Long id,
                                                @RequestBody AnularRequest request) {
        try {
            Venta anulada = ventaService.anularComprobante(
                    id, request.getMotivoAnulacion(), request.getPinAdmin());
            return ResponseEntity.ok(anulada);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** Método legado: cambia estado (mantener por compatibilidad) */
    @PutMapping("/{id}")
    public ResponseEntity<Venta> actualizar(@PathVariable Long id, @RequestBody Venta datos) {
        Venta modificada = ventaService.cambiarEstadoVenta(id, datos.isActivo(), datos.getMotivoAnulacion());
        return ResponseEntity.ok(modificada);
    }

    @PostMapping("/{id}/emitir")
    public ResponseEntity<Venta> emitirComprobante(@PathVariable Long id,
                                                    @RequestBody EmitirRequest request) {
        Venta emitida = ventaService.emitirComprobante(
                id, request.getTipo(), request.getRuc(), request.getRazonSocial());
        return ResponseEntity.ok(emitida);
    }

    // ── DTOs ─────────────────────────────────────────────

    @Data
    @ValidSunatDocument
    public static class VentaRequest {
        private Long socioId;

        /**
         * Lista de pagos. Permite pagos mixtos (ej. EFECTIVO + YAPE).
         * La suma de los montos debe ser igual al total de los detalles.
         */
        @NotEmpty(message = "Debe indicar al menos un método de pago")
        private List<PagoVenta> pagos;

        @NotEmpty(message = "Debe haber al menos un detalle de venta")
        private List<DetalleVenta> detalles;

        @NotNull(message = "El tipo de comprobante es obligatorio")
        private Venta.TipoComprobante tipoComprobante;
        private String clienteNombre;
        private String clienteDocumento;
    }

    @Data
    public static class AnularRequest {
        @NotNull(message = "El motivo de anulación es obligatorio")
        private String motivoAnulacion;
        @NotNull(message = "El PIN de administrador es obligatorio")
        private String pinAdmin;
    }

    @Data
    @ValidSunatDocument
    public static class EmitirRequest {
        private Venta.TipoComprobante tipo;
        private String ruc;
        private String razonSocial;
    }
}
