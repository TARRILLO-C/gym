package com.gym.repositories;

import com.gym.models.MovimientoInventario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovimientoInventarioRepository extends JpaRepository<MovimientoInventario, Long> {
    List<MovimientoInventario> findByProductoIdOrderByFechaCreacionDesc(Long productoId);
    List<MovimientoInventario> findAllByOrderByFechaCreacionDesc();
}
