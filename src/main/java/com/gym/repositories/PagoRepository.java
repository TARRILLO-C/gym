package com.gym.repositories;

import com.gym.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
}
