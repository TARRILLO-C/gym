package com.gym.controllers;

import com.gym.models.Producto;
import com.gym.services.ProductoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

/**
 * Controlador REST para el Punto de Venta (Productos).
 */
@RestController
@RequestMapping("/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService productoService;

    @GetMapping
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<Producto>> listarTodos() {
        return ResponseEntity.ok(productoService.listarTodos());
    }

    @GetMapping("/disponibles")
    public ResponseEntity<List<Producto>> listarDisponibles() {
        return ResponseEntity.ok(productoService.listarConStock());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('productos:crear')")
    public ResponseEntity<Producto> crear(@Valid @RequestBody Producto producto) {
        return new ResponseEntity<>(productoService.crear(producto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('productos:editar')")
    public ResponseEntity<Producto> actualizar(@PathVariable Long id, @Valid @RequestBody Producto producto) {
        return ResponseEntity.ok(productoService.actualizar(id, producto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('productos:eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        productoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/por-vencer")
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<Producto>> productosPorVencer() {
        return ResponseEntity.ok(productoService.productosPorVencer());
    }

    @GetMapping("/vencidos")
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<Producto>> productosVencidos() {
        return ResponseEntity.ok(productoService.productosVencidos());
    }
}
