package com.gym.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuración global de CORS para permitir peticiones desde el frontend de React.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*") // En producción, especificar el dominio real
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(@NonNull org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        // Servir los archivos imágenes estáticos locales
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}
