package com.gym.config;

import com.gym.models.CategoriaProducto;
import com.gym.repositories.CategoriaProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class CategoriaDataInitializer implements ApplicationRunner {

    private final CategoriaProductoRepository categoriaProductoRepository;

    private static final List<String> CATEGORIAS_INICIALES = List.of(
            "BEBIDA", "SUPLEMENTO", "ACCESORIO", "ROPA", "OTRO"
    );

    @Override
    public void run(ApplicationArguments args) {
        for (String nombre : CATEGORIAS_INICIALES) {
            if (!categoriaProductoRepository.existsByNombreIgnoreCase(nombre)) {
                categoriaProductoRepository.save(
                        CategoriaProducto.builder().nombre(nombre).activo(true).build()
                );
            }
        }
    }
}
