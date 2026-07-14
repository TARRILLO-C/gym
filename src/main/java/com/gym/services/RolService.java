package com.gym.services;

import com.gym.models.Rol;
import com.gym.models.Permiso;
import com.gym.repositories.RolRepository;
import com.gym.repositories.PermisoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Servicio para gestionar las operaciones de negocio del modelo Rol y sus permisos asignados.
 */
@Service
public class RolService {

    @Autowired
    private RolRepository rolRepository;

    @Autowired
    private PermisoRepository permisoRepository;

    @Transactional(readOnly = true)
    public List<Rol> listarTodos() {
        return rolRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Rol> buscarPorId(Long id) {
        return rolRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Rol> buscarPorNombre(String nombre) {
        return rolRepository.findByNombre(nombre);
    }

    @Transactional
    public Rol guardarRol(Rol rol) {
        if (rolRepository.findByNombre(rol.getNombre()).isPresent() && rol.getId() == null) {
            throw new RuntimeException("El nombre del rol ya existe");
        }
        return rolRepository.save(rol);
    }

    /**
     * Actualiza la lista de permisos asignados a un rol específico.
     * @param rolId Identificador del rol.
     * @param permisoIds Conjunto de IDs de los nuevos permisos a asignar.
     * @return El Rol actualizado.
     */
    @Transactional
    public Rol actualizarPermisosRol(Long rolId, Set<Long> permisoIds) {
        Rol rol = rolRepository.findById(rolId)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado con ID: " + rolId));

        List<Permiso> permisosList = permisoRepository.findAllById(permisoIds);
        rol.setPermisos(new HashSet<>(permisosList));

        return rolRepository.save(rol);
    }
}
