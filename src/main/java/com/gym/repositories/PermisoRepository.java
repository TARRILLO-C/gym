package com.gym.repositories;

import com.gym.models.Permiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio de Spring Data JPA para realizar operaciones de persistencia sobre la entidad Permiso.
 */
@Repository
public interface PermisoRepository extends JpaRepository<Permiso, Long> {

    /**
     * Busca un permiso por su código único (e.g., usuarios:crear).
     * @param codigo Código único del permiso.
     * @return Un Optional conteniendo el Permiso si existe.
     */
    Optional<Permiso> findByCodigo(String codigo);

    /**
     * Busca todos los permisos asociados a un módulo particular (e.g., VENTAS, SOCIOS).
     * @param modulo Nombre del módulo en mayúsculas.
     * @return Una lista de permisos.
     */
    List<Permiso> findByModulo(String modulo);
}
