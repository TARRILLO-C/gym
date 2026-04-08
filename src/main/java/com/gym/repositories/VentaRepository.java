package com.gym.repositories;

import com.gym.models.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repositorio JPA para la entidad Venta.
 */
@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    /**
     * Retorna todas las ventas realizadas por un socio.
     */
    List<Venta> findBySocioId(Long socioId);

    /**
     * Retorna las ventas realizadas en un rango de fechas (para reportes).
     */
    List<Venta> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin);
}
