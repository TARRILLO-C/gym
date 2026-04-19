package com.gym.repositories;

import com.gym.models.Suscripcion;
import com.gym.models.Suscripcion.EstadoPago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para la entidad {@link Suscripcion}.
 * Permite consultar el historial de suscripciones por socio, estado de pago y vigencia.
 */
@Repository
public interface SuscripcionRepository extends JpaRepository<Suscripcion, Long> {

    /**
     * Retorna todas las suscripciones de un socio específico.
     *
     * @param socioId ID del socio
     * @return lista de suscripciones del socio
     */
    List<Suscripcion> findBySocioId(Long socioId);

    /**
     * Retorna todas las suscripciones filtradas por estado de pago.
     *
     * @param estadoPago estado a filtrar (PAGADO, PENDIENTE, VENCIDO)
     * @return lista de suscripciones con ese estado
     */
    List<Suscripcion> findByEstadoPago(EstadoPago estadoPago);

    /**
     * Busca la suscripción activa y vigente de un socio (independientemente del pago).
     * Se considera vigente si la fecha de fin es posterior o igual a hoy.
     *
     * @param socioId    ID del socio
     * @param hoy        fecha actual para comparación
     * @return Optional con la suscripción activa más reciente si existe
     */
    Optional<Suscripcion> findFirstBySocioIdAndFechaFinGreaterThanEqualOrderByFechaFinDesc(
            Long socioId,
            LocalDate hoy);

    /**
     * Retorna suscripciones cuya fecha de fin se encuentre en el rango dado.
     * Útil para filtrar "Vencen esta semana".
     *
     * @param inicio fecha inicial
     * @param fin    fecha final
     * @return lista de suscripciones en ese rango
     */
    List<Suscripcion> findByFechaFinBetween(LocalDate inicio, LocalDate fin);

    /**
     * Retorna suscripciones ya vencidas.
     *
     * @param fecha fecha actual
     * @return lista de suscripciones cuya fecha de fin es anterior a hoy
     */
    List<Suscripcion> findByFechaFinBefore(LocalDate fecha);
}
