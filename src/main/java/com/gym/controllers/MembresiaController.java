package com.gym.controllers;

import com.gym.models.Membresia;
import com.gym.services.MembresiaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

/**
 * Controlador REST para la gestión de Planes de Membresía.
 */
@RestController
@RequestMapping("/membresias")
@RequiredArgsConstructor
public class MembresiaController {

    private final MembresiaService membresiaService;

    @GetMapping
    public ResponseEntity<List<Membresia>> listarTodas() {
        return ResponseEntity.ok(membresiaService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Membresia> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(membresiaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Membresia> crear(@Valid @RequestBody Membresia membresia) {
        return new ResponseEntity<>(membresiaService.crear(membresia), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Membresia> actualizar(@PathVariable Long id, @Valid @RequestBody Membresia membresia) {
        return ResponseEntity.ok(membresiaService.actualizar(id, membresia));
    }

    /**
     * Actualiza solo la imagen de un plan (evita validación completa del objeto).
     */
    @PatchMapping("/{id}/imagen")
    public ResponseEntity<Membresia> actualizarImagen(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String imagenUrl = body.get("imagenUrl");
        return ResponseEntity.ok(membresiaService.actualizarImagen(id, imagenUrl));
    }

    /**
     * Actualiza solo la visibilidad en catálogo de un plan.
     */
    @PatchMapping("/{id}/catalogo")
    public ResponseEntity<Membresia> actualizarCatalogo(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body) {
        Boolean mostrar = body.get("mostrarEnCatalogo");
        return ResponseEntity.ok(membresiaService.actualizarMostrarEnCatalogo(id, mostrar));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        membresiaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
