package com.gym.controllers;

import com.gym.models.CategoriaProducto;
import com.gym.services.CategoriaProductoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/categorias-producto")
@RequiredArgsConstructor
public class CategoriaProductoController {

    private final CategoriaProductoService categoriaProductoService;

    @GetMapping
    public ResponseEntity<List<CategoriaProducto>> listarActivas() {
        return ResponseEntity.ok(categoriaProductoService.listarActivas());
    }

    @GetMapping("/todas")
    public ResponseEntity<List<CategoriaProducto>> listarTodas(
            @RequestHeader(value = "X-User-Role", required = false) String rol) {
        if (!"ADMINISTRADOR".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(categoriaProductoService.listarTodas());
    }

    @PostMapping
    public ResponseEntity<CategoriaProducto> crear(
            @RequestHeader(value = "X-User-Role", required = false) String rol,
            @RequestBody Map<String, String> body) {
        if (!"ADMINISTRADOR".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String nombre = body.get("nombre");
        return new ResponseEntity<>(categoriaProductoService.crear(nombre), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaProducto> actualizar(
            @RequestHeader(value = "X-User-Role", required = false) String rol,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (!"ADMINISTRADOR".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String nombre = (String) body.get("nombre");
        Boolean activo = body.containsKey("activo") ? Boolean.valueOf(body.get("activo").toString()) : null;
        return ResponseEntity.ok(categoriaProductoService.actualizar(id, nombre, activo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @RequestHeader(value = "X-User-Role", required = false) String rol,
            @PathVariable Long id) {
        if (!"ADMINISTRADOR".equals(rol)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        categoriaProductoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
