package com.gym.controllers;

import com.gym.dtos.auth.LoginRequest;
import com.gym.dtos.auth.LoginResponse;
import com.gym.models.Usuario;
import com.gym.services.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/usuarios")
@CrossOrigin("*")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        Optional<Usuario> usuarioOpt = usuarioService.validarCredenciales(loginRequest.getUsername(), loginRequest.getPassword());
        
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            LoginResponse response = new LoginResponse(usuario.getUsername(), usuario.getRol(), "Login exitoso");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales incorrectas");
        }
    }

    @GetMapping
    public ResponseEntity<?> listarUsuarios() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @PostMapping
    public ResponseEntity<?> crearUsuario(@Valid @RequestBody Usuario usuario) {
        try {
            Usuario nuevoUsuario = usuarioService.guardarUsuario(usuario);
            return ResponseEntity.ok(nuevoUsuario);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        try {
            Optional<Usuario> userOpt = usuarioService.findById(id);
            if (userOpt.isPresent() && "ADMINISTRADOR".equals(userOpt.get().getRol())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No se puede eliminar a un administrador del sistema.");
            }
            usuarioService.eliminarUsuario(id);
            return ResponseEntity.ok("Usuario eliminado correctamente");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @Valid @RequestBody Usuario usuarioDetails) {
        try {
            Optional<Usuario> usuarioOpt = usuarioService.findById(id);
            if (usuarioOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
            }
            Usuario usuario = usuarioOpt.get();
            usuario.setUsername(usuarioDetails.getUsername());
            if (usuarioDetails.getPassword() != null && !usuarioDetails.getPassword().isEmpty() && !usuarioDetails.getPassword().equals("********")) {
                usuario.setPassword(usuarioDetails.getPassword());
            }
            usuario.setRol(usuarioDetails.getRol());
            
            if ("ADMINISTRADOR".equals(usuario.getRol()) && !usuarioDetails.isActivo()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Seguridad: No se permite desactivar a usuarios con rol ADMINISTRADOR.");
            }
            usuario.setActivo(usuarioDetails.isActivo());
            Usuario actualizado = usuarioService.guardarUsuario(usuario);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
