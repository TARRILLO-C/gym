package com.gym.services;

import com.gym.models.Usuario;
import com.gym.models.Rol;
import com.gym.models.Permiso;
import com.gym.repositories.UsuarioRepository;
import com.gym.repositories.RolRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Servicio para gestionar la lógica de negocio de los usuarios (personal) del gimnasio.
 */
@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Inicialización del sistema (Seed Data).
     * Si no existen usuarios, crea las cuentas administrador y recepción por defecto asociándolas a sus nuevos roles relacionales.
     */
    @PostConstruct
    public void init() {
        if (usuarioRepository.count() == 0) {
            Rol adminRol = rolRepository.findByNombre("ADMINISTRADOR")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("ADMINISTRADOR").descripcion("Acceso total al sistema").activo(true).build()));
            Rol recepRol = rolRepository.findByNombre("RECEPCIONISTA")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("RECEPCIONISTA").descripcion("Acceso operativo del gimnasio").activo(true).build()));

            Usuario admin = Usuario.builder()
                .username("admin")
                .password(passwordEncoder.encode("admin"))
                .rol(adminRol)
                .activo(true)
                .build();
            usuarioRepository.save(admin);

            Usuario recep = Usuario.builder()
                .username("recepcion")
                .password(passwordEncoder.encode("recepcion"))
                .rol(recepRol)
                .activo(true)
                .build();
            usuarioRepository.save(recep);
        }
    }

    /**
     * Valida las credenciales de inicio de sesión de un usuario.
     * @param username Nombre del usuario.
     * @param password Contraseña plana ingresada.
     * @return El Usuario autenticado envuelto en un Optional.
     */
    @Transactional(readOnly = true)
    public Optional<Usuario> validarCredenciales(String username, String password) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            if (usuario.isActivo() && passwordEncoder.matches(password, usuario.getPassword())) {
                return Optional.of(usuario);
            }
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Usuario> findAll() {
        return usuarioRepository.findAll();
    }

    /**
     * Guarda o actualiza un usuario aplicando validaciones de duplicación y encriptación de contraseña.
     * @param usuario Datos del usuario a guardar.
     * @return El usuario guardado.
     */
    @Transactional
    public Usuario guardarUsuario(Usuario usuario) {
        Optional<Usuario> existente = usuarioRepository.findByUsername(usuario.getUsername());
        if (existente.isPresent() && (usuario.getId() == null || !existente.get().getId().equals(usuario.getId()))) {
            throw new RuntimeException("El nombre de usuario ya existe");
        }

        // Encriptar la contraseña si viene en texto plano
        if (usuario.getPassword() != null && !usuario.getPassword().startsWith("$2a$")) {
            usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        }

        // Asignar rol RECEPCIONISTA por defecto si no se define uno
        if (usuario.getRol() == null) {
            Rol recepRol = rolRepository.findByNombre("RECEPCIONISTA")
                .orElseThrow(() -> new RuntimeException("El rol predeterminado RECEPCIONISTA no existe en la BD"));
            usuario.setRol(recepRol);
        }

        return usuarioRepository.save(usuario);
    }

    /**
     * Realiza una eliminación lógica (desactivación) de un usuario por seguridad.
     * @param id ID del usuario a desactivar.
     */
    @Transactional
    public void eliminarUsuario(Long id) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findById(id);
        if (usuarioOpt.isPresent()) {
            Usuario u = usuarioOpt.get();
            if ("admin".equalsIgnoreCase(u.getUsername())) {
                throw new RuntimeException("No se puede desactivar al administrador principal");
            }
            u.setActivo(false);
            usuarioRepository.save(u);
        }
    }

    /**
     * Obtiene de forma transaccional y segura la lista de códigos de permisos asignados al rol del usuario.
     * Previene LazyInitializationException fuera del ciclo transaccional.
     * @param usuario Entidad Usuario.
     * @return Lista de strings representando los permisos (e.g., ["socios:crear", "ventas:anular"]).
     */
    @Transactional(readOnly = true)
    public List<String> obtenerCodigosPermisos(Usuario usuario) {
        if (usuario == null || usuario.getRol() == null) {
            return List.of();
        }
        Rol rol = rolRepository.findById(usuario.getRol().getId())
                .orElseThrow(() -> new RuntimeException("Rol no encontrado en la base de datos"));
        return rol.getPermisos().stream()
                .map(Permiso::getCodigo)
                .toList();
    }
}
