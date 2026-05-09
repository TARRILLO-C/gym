package com.gym.repositories;

import com.gym.models.Socio;
import com.gym.models.Socio.EstadoSocio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SocioRepository extends JpaRepository<Socio, Long> {

    Optional<Socio> findByDni(String dni);

    boolean existsByDni(String dni);

    boolean existsByRuc(String ruc);

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
