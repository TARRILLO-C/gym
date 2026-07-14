package com.gym.services;

import com.gym.models.Permiso;
import com.gym.repositories.PermisoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Servicio para gestionar las consultas y catálogos de los permisos del sistema.
 */
@Service
public class PermisoService {

    @Autowired
    private PermisoRepository permisoRepository;

    @Transactional(readOnly = true)
    public List<Permiso> listarTodos() {
        return permisoRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Permiso> buscarPorId(Long id) {
        return permisoRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Permiso> buscarPorCodigo(String codigo) {
        return permisoRepository.findByCodigo(codigo);
    }

    @Transactional(readOnly = true)
    public List<Permiso> buscarPorModulo(String modulo) {
        return permisoRepository.findByModulo(modulo);
    }
}
