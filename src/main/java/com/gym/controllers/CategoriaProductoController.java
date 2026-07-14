package com.gym.controllers;

import com.gym.models.CategoriaProducto;
import com.gym.services.CategoriaProductoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/categorias-producto")
@RequiredArgsConstructor
public class CategoriaProductoController {

    private final CategoriaProductoService categoriaProductoService;

    @GetMapping
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<CategoriaProducto>> listarActivas() {
        return ResponseEntity.ok(categoriaProductoService.listarActivas());
    }

    @GetMapping("/todas")
    @PreAuthorize("hasAuthority('productos:ver')")
    public ResponseEntity<List<CategoriaProducto>> listarTodas() {
        return ResponseEntity.ok(categoriaProductoService.listarTodas());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('productos:crear')")
    public ResponseEntity<CategoriaProducto> crear(@RequestBody Map<String, String> body) {
        String nombre = body.get("nombre");
        return new ResponseEntity<>(categoriaProductoService.crear(nombre), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('productos:editar')")
    public ResponseEntity<CategoriaProducto> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        String nombre = (String) body.get("nombre");
        Boolean activo = body.containsKey("activo") ? Boolean.valueOf(body.get("activo").toString()) : null;
        return ResponseEntity.ok(categoriaProductoService.actualizar(id, nombre, activo));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('productos:eliminar')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        categoriaProductoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
