package com.gym.repositories;

import com.gym.models.LogAnulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogAnulacionRepository extends JpaRepository<LogAnulacion, Long> {
    List<LogAnulacion> findByVentaIdOrderByFechaDesc(Long ventaId);
    List<LogAnulacion> findBySesionIdOrderByFechaDesc(Long sesionId);
}
