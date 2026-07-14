package com.gym.repositories;

import com.gym.models.SolicitudProducto;
import com.gym.models.SolicitudProducto.EstadoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SolicitudProductoRepository extends JpaRepository<SolicitudProducto, Long> {
    boolean existsByNumeroOperacion(String numeroOperacion);

    @Query("SELECT s FROM SolicitudProducto s "
            + "LEFT JOIN FETCH s.items i "
            + "LEFT JOIN FETCH i.producto "
            + "WHERE s.id = :id")
    Optional<SolicitudProducto> findByIdWithDetalles(@Param("id") Long id);
    List<SolicitudProducto> findByEstado(EstadoSolicitud estado);

    @Query("SELECT DISTINCT s FROM SolicitudProducto s "
            + "LEFT JOIN FETCH s.items i "
            + "LEFT JOIN FETCH i.producto "
            + "WHERE s.estado = :estado "
            + "ORDER BY s.fechaSolicitud DESC")
    List<SolicitudProducto> findByEstadoWithDetalles(@Param("estado") EstadoSolicitud estado);

    @Query("SELECT DISTINCT s FROM SolicitudProducto s "
            + "LEFT JOIN FETCH s.items i "
            + "LEFT JOIN FETCH i.producto "
            + "ORDER BY s.fechaSolicitud DESC")
    List<SolicitudProducto> findAllWithDetalles();

    List<SolicitudProducto> findByEstadoAndFechaSolicitudBefore(EstadoSolicitud estado, java.time.LocalDateTime fecha);
}
