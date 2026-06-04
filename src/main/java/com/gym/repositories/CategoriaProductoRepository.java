package com.gym.repositories;

import com.gym.models.CategoriaProducto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaProductoRepository extends JpaRepository<CategoriaProducto, Long> {

    List<CategoriaProducto> findByActivoTrueOrderByNombreAsc();

    List<CategoriaProducto> findAllByOrderByNombreAsc();

    Optional<CategoriaProducto> findByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCase(String nombre);
}
