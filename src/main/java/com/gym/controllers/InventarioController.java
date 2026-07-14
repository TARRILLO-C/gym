package com.gym.controllers;

import com.gym.dtos.inventario.AjusteInventarioRequest;
import com.gym.dtos.inventario.MovimientoInventarioResponse;
import com.gym.services.InventarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventario")
@RequiredArgsConstructor
public class InventarioController {

    private final InventarioService inventarioService;

    @PostMapping("/ajustes")
    @PreAuthorize("hasAuthority('productos:editar')")
    public ResponseEntity<MovimientoInventarioResponse> ajustarStock(
            @Valid @RequestBody AjusteInventarioRequest request) {
        MovimientoInventarioResponse response = inventarioService.ajustarStock(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/movimientos")
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<MovimientoInventarioResponse>> listarMovimientos(
            @RequestParam(required = false) Long productoId) {
        return ResponseEntity.ok(inventarioService.listarMovimientos(productoId));
    }

    @GetMapping("/movimientos/{id}")
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<MovimientoInventarioResponse> buscarMovimiento(@PathVariable Long id) {
        return ResponseEntity.ok(inventarioService.buscarPorId(id));
    }
}
