package com.gym.repositories;

import com.gym.models.Socio;
import com.gym.models.Socio.EstadoSocio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para la entidad {@link Socio}.
 * Proporciona operaciones CRUD básicas heredadas de JpaRepository,
 * más consultas derivadas específicas del dominio.
 */
@Repository
public interface SocioRepository extends JpaRepository<Socio, Long> {

    /**
     * Busca un socio por su DNI (identificador único nacional).
     *
     * @param dni número de DNI a buscar
     * @return Optional con el socio si existe
     */
    Optional<Socio> findByDni(String dni);

    /**
     * Verifica si ya existe un socio registrado con el DNI dado.
     */
    boolean existsByDni(String dni);

    /**
     * Verifica si ya existe un socio con este RUC.
     */
    boolean existsByRuc(String ruc);

    /**
     * Verifica si ya existe un socio con este Email.
     */
    boolean existsByEmail(String email);

    /**
     * Retorna todos los socios filtrados por estado (ACTIVO / INACTIVO).
     *
     * @param estado estado a filtrar
     * @return lista de socios con ese estado
     */
    List<Socio> findByEstado(EstadoSocio estado);

    /**
     * Búsqueda de socios cuyo nombre contenga el texto dado (case-insensitive).
     *
     * @param nombre fragmento del nombre a buscar
     * @return lista de socios que coinciden
     */
    List<Socio> findByNombreCompletoContainingIgnoreCase(String nombre);
}
