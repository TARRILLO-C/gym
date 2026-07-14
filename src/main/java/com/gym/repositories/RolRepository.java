package com.gym.repositories;

import com.gym.models.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio de Spring Data JPA para realizar operaciones de persistencia sobre la entidad Rol.
 */
@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {
    
    /**
     * Busca un rol por su nombre único (e.g., ADMINISTRADOR, RECEPCIONISTA).
     * @param nombre Nombre del rol.
     * @return Un Optional conteniendo el Rol si existe.
     */
    Optional<Rol> findByNombre(String nombre);
}
