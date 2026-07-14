package com.gym.security;

import com.gym.models.Usuario;
import com.gym.models.Permiso;
import com.gym.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Servicio personalizado de seguridad para cargar los detalles de usuario y sus privilegios (roles y permisos granulares)
 * desde la base de datos relacional de THE JUNGLE.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con el nombre de usuario: " + username));

        if (!usuario.isActivo()) {
            throw new UsernameNotFoundException("El usuario '" + username + "' está inactivo en el sistema.");
        }

        List<GrantedAuthority> authorities = new ArrayList<>();

        if (usuario.getRol() != null) {
            // 1. Agregar el rol principal con prefijo ROLE_ (por convención de Spring Security)
            authorities.add(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombre()));

            // 2. Agregar los códigos de los permisos del rol directamente como GrantedAuthority
            if (usuario.getRol().getPermisos() != null) {
                for (Permiso permiso : usuario.getRol().getPermisos()) {
                    authorities.add(new SimpleGrantedAuthority(permiso.getCodigo()));
                }
            }
        }

        return new User(
                usuario.getUsername(),
                usuario.getPassword(),
                usuario.isActivo(),
                true, // accountNonExpired
                true, // credentialsNonExpired
                true, // accountNonLocked
                authorities
        );
    }
}
