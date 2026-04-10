package com.gym.controllers;

import com.gym.models.DetalleVenta;
import com.gym.models.Venta;
import com.gym.services.VentaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<Venta> registrarVenta(@RequestBody VentaRequest request) {
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

    /**
     * DTO interno para recibir la solicitud de venta.
     */
    @Data
    public static class VentaRequest {
        private Long socioId;
        private Venta.MetodoPago metodoPago;
        private List<DetalleVenta> detalles;
        private Venta.TipoComprobante tipoComprobante;
        private String clienteNombre;
        private String clienteDocumento;
    }
}
