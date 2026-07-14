package com.gym.controllers;

import com.gym.models.Socio;
import com.gym.services.SocioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.validation.Valid;

/**
 * Controlador REST para la gestión de Socios.
 * Proporciona endpoints para el registro, consulta, actualización y eliminación.
 */
@RestController
@RequestMapping("/socios")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SocioController {

    private final SocioService socioService;

    @GetMapping
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<List<Socio>> listarTodos(@RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(socioService.buscarPorQuery(search.trim()));
        }
        return ResponseEntity.ok(socioService.listarTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<Socio> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(socioService.buscarPorId(id));
    }

    @GetMapping("/dni/{dni}")
    @PreAuthorize("hasAuthority('socios:ver')")
    public ResponseEntity<Socio> buscarPorDni(@PathVariable String dni) {
        return ResponseEntity.ok(socioService.buscarPorDni(dni));
    }

    @GetMapping("/public/dni/{dni}")
    public ResponseEntity<Socio> buscarSocioPublicoPorDni(@PathVariable String dni) {
        return ResponseEntity.ok(socioService.buscarPorDni(dni));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('socios:crear')")
    public ResponseEntity<Socio> registrar(@Valid @RequestBody Socio socio) {
        return new ResponseEntity<>(socioService.registrar(socio), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('socios:editar')")
    public ResponseEntity<Socio> actualizar(@PathVariable Long id, @Valid @RequestBody Socio socio) {
        return ResponseEntity.ok(socioService.actualizar(id, socio));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('socios:eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        socioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
