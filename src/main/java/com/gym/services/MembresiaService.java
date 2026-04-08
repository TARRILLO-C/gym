package com.gym.services;

import com.gym.exceptions.DuplicateResourceException;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.Membresia;
import com.gym.repositories.MembresiaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de negocio para la entidad {@link Membresia}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MembresiaService {

    private final MembresiaRepository membresiaRepository;

    @Transactional(readOnly = true)
    public List<Membresia> listarTodas() {
        return membresiaRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Membresia buscarPorId(Long id) {
        return membresiaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Membresía", id));
    }

    @Transactional
    public Membresia crear(Membresia membresia) {
        if (membresiaRepository.existsByNombre(membresia.getNombre())) {
            throw new DuplicateResourceException(
                    "Ya existe una membresía con nombre: " + membresia.getNombre());
        }
        Membresia guardada = membresiaRepository.save(membresia);
        log.info("Membresía creada: {} ({} días)", guardada.getNombre(), guardada.getDuracionDias());
        return guardada;
    }

    @Transactional
    public Membresia actualizar(Long id, Membresia detalles) {
        Membresia membresia = buscarPorId(id);
        membresia.setNombre(detalles.getNombre());
        membresia.setPrecio(detalles.getPrecio());
        membresia.setDuracionDias(detalles.getDuracionDias());
        membresia.setDescripcion(detalles.getDescripcion());
        membresia.setEstado(detalles.getEstado());
        return membresiaRepository.save(membresia);
    }

    @Transactional
    public void eliminar(Long id) {
        Membresia mem = buscarPorId(id);
        membresiaRepository.delete(mem);
        log.info("Membresía ID {} eliminada.", id);
    }
}
