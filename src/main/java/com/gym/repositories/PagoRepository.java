package com.gym.repositories;

import com.gym.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {
    List<Pago> findBySuscripcionId(Long suscripcionId);
    List<Pago> findBySuscripcionSocioId(Long socioId);

    @Query("SELECT p FROM Pago p "
            + "JOIN FETCH p.suscripcion s "
            + "JOIN FETCH s.socio "
            + "JOIN FETCH s.membresia "
            + "ORDER BY p.fechaPago DESC")
    List<Pago> findAllWithRelaciones();

    @Query("SELECT p.metodoPago, COALESCE(SUM(p.monto), 0) FROM Pago p "
            + "WHERE p.fechaPago BETWEEN :inicio AND :fin "
            + "AND (p.venta IS NULL OR p.venta.activo <> false) "
            + "GROUP BY p.metodoPago")
    List<Object[]> findResumenMetodos(LocalDateTime inicio, LocalDateTime fin);
}
