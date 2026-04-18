package com.gym.controllers;

import com.gym.models.DetalleVenta;
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

import java.util.List;

/**
 * Controlador REST para el Punto de Venta.
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

    @PostMapping
    public ResponseEntity<Venta> registrarVenta(@Valid @RequestBody VentaRequest request) {
        Venta nueva = ventaService.registrarVenta(
                request.getSocioId(),
                request.getMetodoPago(),
                request.getDetalles(),
                request.getTipoComprobante(),
                request.getClienteNombre(),
                request.getClienteDocumento()
        );
        return new ResponseEntity<>(nueva, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Venta> actualizar(@PathVariable Long id, @RequestBody Venta datos) {
        // En este sistema, el PUT de venta se usa casi exclusivamente para
        // anular (activo = false) o restaurar (activo = true).
        Venta modificada = ventaService.cambiarEstadoVenta(id, datos.isActivo(), datos.getMotivoAnulacion());
        return ResponseEntity.ok(modificada);
    }

    @PostMapping("/{id}/emitir")
    public ResponseEntity<Venta> emitirComprobante(@PathVariable Long id, @RequestBody EmitirRequest request) {
        Venta emitida = ventaService.emitirComprobante(id, request.getTipo(), request.getRuc(), request.getRazonSocial());
        return ResponseEntity.ok(emitida);
    }

    @Data
    public static class EmitirRequest {
        private Venta.TipoComprobante tipo;
        private String ruc;
        private String razonSocial;
    }

    /**
     * DTO interno para recibir la solicitud de venta original.
     */
    @Data
    public static class VentaRequest {
        private Long socioId;

        @NotNull(message = "El método de pago es obligatorio")
        private Venta.MetodoPago metodoPago;

        @NotEmpty(message = "Debe haber al menos un detalle de venta")
        private List<DetalleVenta> detalles;

        @NotNull(message = "El tipo de comprobante es obligatorio")
        private Venta.TipoComprobante tipoComprobante;
        private String clienteNombre;
        private String clienteDocumento;
    }
}
