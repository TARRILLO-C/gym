package com.gym.controllers;

import com.gym.models.Pago;
import com.gym.services.PagoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pagos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PagoController {

    private final PagoService pagoService;

    @PostMapping("/suscripcion/{id}")
    public ResponseEntity<Pago> registrarPago(@PathVariable Long id, @RequestBody Pago pago) {
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
}
