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
        if (detalles.getEstado() != null) {
            membresia.setEstado(detalles.getEstado());
        }
        if (detalles.getPermiteCongelamiento() != null) {
            membresia.setPermiteCongelamiento(detalles.getPermiteCongelamiento());
        }
        membresia.setPrecioCuota(detalles.getPrecioCuota());
        membresia.setFrecuenciaCobroDias(detalles.getFrecuenciaCobroDias());
        membresia.setImagenUrl(detalles.getImagenUrl());
        if (detalles.getMostrarEnCatalogo() != null) {
            membresia.setMostrarEnCatalogo(detalles.getMostrarEnCatalogo());
        }
        return membresiaRepository.save(membresia);
    }

    @Transactional
    public void eliminar(Long id) {
        Membresia mem = buscarPorId(id);
        mem.setEstado(Membresia.EstadoMembresia.OCULTO);
        membresiaRepository.save(mem);
        log.info("Membresía ID {} pasada a estado OCULTO (borrado lógico).", id);
    }

    /**
     * Actualiza solo la imagen de un plan sin requerir el objeto completo.
     */
    @Transactional
    public Membresia actualizarImagen(Long id, String imagenUrl) {
        Membresia membresia = buscarPorId(id);
        membresia.setImagenUrl(imagenUrl);
        Membresia guardada = membresiaRepository.save(membresia);
        log.info("Imagen de membresía ID {} actualizada.", id);
        return guardada;
    }

    /**
     * Actualiza solo la visibilidad en catálogo de un plan sin requerir el objeto completo.
     */
    @Transactional
    public Membresia actualizarMostrarEnCatalogo(Long id, Boolean mostrar) {
        Membresia membresia = buscarPorId(id);
        if (mostrar != null) {
            membresia.setMostrarEnCatalogo(mostrar);
        }
        Membresia guardada = membresiaRepository.save(membresia);
        log.info("Visibilidad en catálogo de membresía ID {} actualizada a: {}", id, mostrar);
        return guardada;
    }
}
