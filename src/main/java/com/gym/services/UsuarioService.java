package com.gym.services;

import com.gym.models.Usuario;
import com.gym.repositories.UsuarioRepository;
import jakarta.annotation.PostConstruct;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @PostConstruct
    public void init() {
        if (usuarioRepository.count() == 0) {
            Usuario admin = new Usuario("admin", BCrypt.hashpw("admin", BCrypt.gensalt()), "ADMINISTRADOR");
            Usuario recepcion = new Usuario("recepcion", BCrypt.hashpw("recepcion", BCrypt.gensalt()), "RECEPCIONISTA");
            usuarioRepository.save(admin);
            usuarioRepository.save(recepcion);
        }
    }

    public Optional<Usuario> validarCredenciales(String username, String password) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            
            // Validar usando BCrypt si está encriptada
            if (usuario.getPassword() != null && usuario.getPassword().startsWith("$2a$")) {
                if (BCrypt.checkpw(password, usuario.getPassword())) {
                    return Optional.of(usuario);
                }
            } else if (usuario.getPassword() != null) {
                // Migración transparente: Si aún está en texto plano, valida y la encripta internamente para la próxima.
                if (usuario.getPassword().equals(password)) {
                    usuario.setPassword(BCrypt.hashpw(password, BCrypt.gensalt()));
                    usuarioRepository.save(usuario);
                    return Optional.of(usuario);
                }
            }
        }
        return Optional.empty();
    }

    public Optional<Usuario> findById(Long id) {
        return usuarioRepository.findById(id);
    }

    public java.util.List<Usuario> findAll() {
        return usuarioRepository.findAll();
    }

    public Usuario guardarUsuario(Usuario usuario) {
        if (usuarioRepository.findByUsername(usuario.getUsername()).isPresent() && usuario.getId() == null) {
            throw new RuntimeException("El nombre de usuario ya existe");
        }
        
        // Encriptar la contraseña si viene en texto plano (nueva o actualizada)
        if (usuario.getPassword() != null && !usuario.getPassword().startsWith("$2a$")) {
            usuario.setPassword(BCrypt.hashpw(usuario.getPassword(), BCrypt.gensalt()));
        }
        
        return usuarioRepository.save(usuario);
    }

    public void eliminarUsuario(Long id) {
        Optional<Usuario> usuario = usuarioRepository.findById(id);
        if (usuario.isPresent() && "admin".equalsIgnoreCase(usuario.get().getUsername())) {
            throw new RuntimeException("No se puede eliminar al administrador principal");
        }
        if (usuario.isPresent()) {
            Usuario u = usuario.get();
            u.setActivo(false);
            usuarioRepository.save(u);
        }
    }
}
