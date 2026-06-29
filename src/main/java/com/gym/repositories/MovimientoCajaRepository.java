package com.gym.repositories;

import com.gym.models.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    List<MovimientoCaja> findBySesionIdOrderByFechaDesc(Long sesionId);

    /**
     * Suma total de egresos + retiros de una sesión (resta al efectivo esperado).
     */
    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM MovimientoCaja m WHERE m.sesion.id = :sesionId")
    BigDecimal sumBySesionId(Long sesionId);
}
