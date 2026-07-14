package com.gym.audit;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Proveedor de auditoría que obtiene el usuario actual autenticado desde el contexto de Spring Security.
 */
@Component
public class SecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return Optional.of("SYSTEM"); // Retorna SYSTEM para registros anónimos (ej. solicitudes del catálogo)
        }
        
        return Optional.of(authentication.getName());
    }
}
