package com.gym.repositories;

import com.gym.models.SesionCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SesionCajaRepository extends JpaRepository<SesionCaja, Long> {

    /**
     * Busca la sesión actualmente abierta (solo debe haber una).
     */
    Optional<SesionCaja> findByEstado(SesionCaja.EstadoSesion estado);

    /**
     * Historial completo ordenado por apertura descendente.
     */
    List<SesionCaja> findAllByOrderByAperturaAtDesc();

    /**
     * Última sesión cerrada (para sugerir fondo al siguiente turno).
     */
    @Query("SELECT s FROM SesionCaja s WHERE s.estado <> 'ABIERTA' ORDER BY s.cierreAt DESC")
    List<SesionCaja> findUltimaCerrada();
}
