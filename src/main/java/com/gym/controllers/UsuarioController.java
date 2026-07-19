package com.gym.controllers;

import com.gym.dtos.auth.LoginRequest;
import com.gym.dtos.auth.LoginResponse;
import com.gym.dtos.auth.UsuarioDTO;
import com.gym.models.Rol;
import com.gym.models.Usuario;
import com.gym.repositories.RolRepository;
import com.gym.security.JwtService;
import com.gym.services.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Controlador REST para gestionar la autenticación y el CRUD de usuarios (personal).
 * Integra Spring Security AuthenticationManager para el login y emite tokens JWT.
 */
@RestController
@RequestMapping("/usuarios")
@CrossOrigin("*")
public class UsuarioController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ── Autenticación ─────────────────────────────────────────────────────────

    /**
     * Endpoint para iniciar sesión. Valida las credenciales mediante el gestor de autenticación
     * de Spring Security y genera el respectivo JWT.
     * @param loginRequest Objeto DTO conteniendo el usuario y la clave.
     * @return ResponseEntity con el token JWT, datos del usuario, su rol y su lista de permisos.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // 1. Delegar la autenticación de credenciales a Spring Security
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.username(), loginRequest.password())
            );

            // 2. Cargar los detalles del usuario desde la base de datos
            Usuario usuario = usuarioService.validarCredenciales(loginRequest.username(), loginRequest.password())
                    .orElseThrow(() -> new RuntimeException("Error de consistencia al recuperar el usuario autenticado."));

            String rolNombre = usuario.getRol() != null ? usuario.getRol().getNombre() : "SIN_ROL";
            List<String> permisos = usuarioService.obtenerCodigosPermisos(usuario);

            // 3. Generar el JWT firmado
            String token = jwtService.generateToken(authentication.getName(), rolNombre, permisos);

            // 4. Construir respuesta estructurada basada en records
            UsuarioDTO usuarioDTO = new UsuarioDTO(usuario.getId(), usuario.getUsername(), rolNombre);
            LoginResponse loginResponse = new LoginResponse(token, usuarioDTO, rolNombre, permisos);

            return ResponseEntity.ok(loginResponse);

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Credenciales incorrectas o cuenta inactiva."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al procesar el inicio de sesión: " + e.getMessage()));
        }
    }

    // ── CRUD de Usuarios ──────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('personal:ver')")
    public ResponseEntity<?> listarUsuarios() {
        return ResponseEntity.ok(usuarioService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('personal:crear')")
    public ResponseEntity<?> crearUsuario(@Valid @RequestBody Usuario usuario) {
        try {
            // Asegurar que el rol provisto desde el cliente exista y esté persistido
            if (usuario.getRol() != null && usuario.getRol().getId() != null) {
                Rol rolDb = rolRepository.findById(usuario.getRol().getId())
                        .orElseThrow(() -> new RuntimeException("El rol especificado no existe en la BD"));
                usuario.setRol(rolDb);
            }
            Usuario nuevoUsuario = usuarioService.guardarUsuario(usuario);
            return ResponseEntity.ok(nuevoUsuario);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('personal:desactivar')")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        try {
            Optional<Usuario> userOpt = usuarioService.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
            }
            Rol rol = userOpt.get().getRol();
            if (rol != null && "ADMINISTRADOR".equalsIgnoreCase(rol.getNombre())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("No se permite eliminar o desactivar a usuarios con rol ADMINISTRADOR.");
            }
            usuarioService.eliminarUsuario(id);
            return ResponseEntity.ok("Usuario desactivado correctamente");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('personal:editar')")
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id,
                                               @Valid @RequestBody Usuario usuarioDetails) {
        try {
            Optional<Usuario> usuarioOpt = usuarioService.findById(id);
            if (usuarioOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuario no encontrado");
            }
            Usuario usuario = usuarioOpt.get();
            usuario.setUsername(usuarioDetails.getUsername());

            // Validar y aplicar cambio de PIN de administrador con BCrypt
            String pinNuevo = usuarioDetails.getPinAdmin();
            String pinActualHash = usuario.getPinAdmin(); // ya hasheado en BD

            // Si el frontend devuelve el mismo hash almacenado (empieza con $2), no hay intención de cambio
            boolean esElMismoHash = pinNuevo != null && pinNuevo.startsWith("$2");

            if (pinActualHash != null && !pinActualHash.isBlank() && !esElMismoHash) {
                // El usuario ya tiene un PIN configurado y viene un valor diferente (texto plano)
                boolean pinCambio = (pinNuevo == null)
                        || pinNuevo.isBlank()
                        || !passwordEncoder.matches(pinNuevo, pinActualHash);
                if (pinCambio) {
                    // Verificar que el PIN actual proporcionado sea correcto
                    String currentPinIngresado = usuarioDetails.getCurrentPinAdmin();
                    if (currentPinIngresado == null || currentPinIngresado.isBlank()
                            || !passwordEncoder.matches(currentPinIngresado, pinActualHash)) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body("El PIN actual de administrador proporcionado es incorrecto.");
                    }
                    // Hashear el nuevo PIN antes de guardarlo
                    usuario.setPinAdmin(pinNuevo != null && !pinNuevo.isBlank()
                            ? passwordEncoder.encode(pinNuevo) : null);
                }
                // Si matches devolvió true (mismo PIN), no tocar el campo
            } else if (!esElMismoHash && pinActualHash == null) {
                // El usuario no tenía PIN, hashear y guardar el nuevo si viene
                if (pinNuevo != null && !pinNuevo.isBlank()) {
                    usuario.setPinAdmin(passwordEncoder.encode(pinNuevo));
                }
            }
            // Si esElMismoHash == true: no tocar el PIN (el frontend devolvió el hash guardado = sin cambios)

            // Actualizar contraseña si no coincide con la máscara del frontend
            if (usuarioDetails.getPassword() != null
                    && !usuarioDetails.getPassword().isEmpty()
                    && !usuarioDetails.getPassword().equals("********")) {
                usuario.setPassword(usuarioDetails.getPassword());
            }

            // Validar y reasignar el Rol especificado
            if (usuarioDetails.getRol() != null && usuarioDetails.getRol().getId() != null) {
                Rol rolDb = rolRepository.findById(usuarioDetails.getRol().getId())
                        .orElseThrow(() -> new RuntimeException("El rol especificado no existe en la BD"));
                usuario.setRol(rolDb);
            }

            // Impedir desactivación del Administrador
            if (usuario.getRol() != null && "ADMINISTRADOR".equalsIgnoreCase(usuario.getRol().getNombre()) && !usuarioDetails.isActivo()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Seguridad: No se permite desactivar a usuarios con rol ADMINISTRADOR.");
            }
            usuario.setActivo(usuarioDetails.isActivo());

            Usuario actualizado = usuarioService.guardarUsuario(usuario);
            return ResponseEntity.ok(actualizado);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
