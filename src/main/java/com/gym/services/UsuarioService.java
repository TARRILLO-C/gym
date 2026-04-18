package com.gym.services;

import com.gym.models.Usuario;
import com.gym.repositories.UsuarioRepository;
import jakarta.annotation.PostConstruct;
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
            usuarioRepository.save(new Usuario("admin", "admin", "ADMINISTRADOR"));
            usuarioRepository.save(new Usuario("recepcion", "recepcion", "RECEPCIONISTA"));
        }
    }

    public Optional<Usuario> validarCredenciales(String username, String password) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByUsername(username);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            // Comparación simple por ahora
            if (usuario.getPassword().equals(password)) {
                return Optional.of(usuario);
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
