package com.gym.repositories;

import com.gym.models.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repositorio JPA para la entidad {@link Asistencia}.
 * Gestiona el historial de ingresos de los socios al gimnasio.
 */
@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {

    /**
     * Retorna todos los registros de asistencia de un socio dado.
     *
     * @param socioId ID del socio
     * @return lista de asistencias del socio
     */
    List<Asistencia> findBySocioId(Long socioId);

    /**
     * Retorna los ingresos registrados dentro de un rango de fechas/horas.
     * Útil para reportes diarios o mensuales de afluencia.
     *
     * @param desde inicio del rango
     * @param hasta fin del rango
     * @return lista de asistencias en ese rango
     */
    List<Asistencia> findByFechaHoraIngresoBetween(LocalDateTime desde, LocalDateTime hasta);

    /**
     * Cuenta la cantidad de ingresos de un socio en un rango fechas.
     *
     * @param socioId ID del socio
     * @param desde   inicio del rango
     * @param hasta   fin del rango
     * @return cantidad de ingresos
     */
    long countBySocioIdAndFechaHoraIngresoBetween(Long socioId, LocalDateTime desde, LocalDateTime hasta);
}
