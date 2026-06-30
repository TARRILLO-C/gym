package com.gym.repositories;

import com.gym.models.Egreso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EgresoRepository extends JpaRepository<Egreso, Long> {
    List<Egreso> findByFechaBetweenOrderByFechaDesc(LocalDateTime inicio, LocalDateTime fin);

    @Query("SELECT COALESCE(SUM(e.monto), 0) FROM Egreso e WHERE e.fecha BETWEEN :inicio AND :fin")
    java.math.BigDecimal sumEgresosByFecha(LocalDateTime inicio, LocalDateTime fin);
}
