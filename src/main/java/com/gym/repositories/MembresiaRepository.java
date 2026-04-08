package com.gym.repositories;

import com.gym.models.Membresia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio JPA para la entidad {@link Membresia}.
 * Gestiona los planes de membresía disponibles en el gimnasio.
 */
@Repository
public interface MembresiaRepository extends JpaRepository<Membresia, Long> {

    /**
     * Busca una membresía por su nombre exacto.
     *
     * @param nombre nombre del plan (ej: "Mensual", "Anual")
     * @return Optional con la membresía si existe
     */
    Optional<Membresia> findByNombre(String nombre);

    /**
     * Verifica si ya existe un plan con ese nombre.
     *
     * @param nombre nombre a verificar
     * @return true si ya existe
     */
    boolean existsByNombre(String nombre);
}
