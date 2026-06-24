package com.gym.repositories;

import com.gym.models.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

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

    @Query("SELECT a FROM Asistencia a JOIN FETCH a.socio s WHERE " +
           "(:search IS NULL OR LOWER(s.nombreCompleto) LIKE LOWER(CONCAT('%', :search, '%')) OR s.dni LIKE CONCAT('%', :search, '%')) AND " +
           "(:fechaDesde IS NULL OR a.fechaHoraIngreso >= :fechaDesde) AND " +
           "(:fechaHasta IS NULL OR a.fechaHoraIngreso <= :fechaHasta) " +
           "ORDER BY a.fechaHoraIngreso DESC")
    List<Asistencia> buscar(@Param("search") String search,
                            @Param("fechaDesde") LocalDateTime fechaDesde,
                            @Param("fechaHasta") LocalDateTime fechaHasta);
}
