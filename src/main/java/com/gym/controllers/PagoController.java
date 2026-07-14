package com.gym.controllers;

import com.gym.models.Pago;
import com.gym.services.PagoService;
import com.gym.dtos.PagoRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/pagos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PagoController {

    private final PagoService pagoService;

    @PostMapping("/suscripcion/{id}")
    public ResponseEntity<Pago> registrarPago(@PathVariable Long id, @Valid @RequestBody PagoRequest request) {
        Pago.MetodoPago metodo = Pago.MetodoPago.EFECTIVO;
        if (request.metodoPago() != null) {
            try {
                metodo = Pago.MetodoPago.valueOf(request.metodoPago());
            } catch (Exception e) {
                // valor por defecto
            }
        }

        Pago pago = Pago.builder()
                .metodoPago(metodo)
                .comentario(request.comentario())
                .generarComprobante(request.generarComprobante() != null ? request.generarComprobante() : false)
                .tipoComprobante(request.tipoComprobante())
                .clienteNombre(request.clienteNombre())
                .clienteDocumento(request.clienteDocumento())
                .build();

        return ResponseEntity.ok(pagoService.registrarPago(id, pago));
    }

    @GetMapping("/suscripcion/{id}")
    public ResponseEntity<List<Pago>> listarPorSuscripcion(@PathVariable Long id) {
        return ResponseEntity.ok(pagoService.listarPorSuscripcion(id));
    }

    @GetMapping("/socio/{socioId}")
    public ResponseEntity<List<Pago>> listarPorSocio(@PathVariable Long socioId) {
        return ResponseEntity.ok(pagoService.listarPorSocio(socioId));
    }

    @GetMapping
    public ResponseEntity<List<Pago>> listarTodos() {
        return ResponseEntity.ok(pagoService.listarTodos());
    }
}
