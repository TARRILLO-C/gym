package com.gym.services;

import com.gym.exceptions.DuplicateResourceException;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.CategoriaProducto;
import com.gym.repositories.CategoriaProductoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoriaProductoService {

    private final CategoriaProductoRepository categoriaProductoRepository;

    @Transactional(readOnly = true)
    public List<CategoriaProducto> listarActivas() {
        return categoriaProductoRepository.findByActivoTrueOrderByNombreAsc();
    }

    @Transactional(readOnly = true)
    public CategoriaProducto buscarPorId(Long id) {
        return categoriaProductoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoría", id));
    }

    @Transactional
    public CategoriaProducto crear(String nombre) {
        String nombreNormalizado = normalizarNombre(nombre);
        if (categoriaProductoRepository.existsByNombreIgnoreCase(nombreNormalizado)) {
            throw new DuplicateResourceException("Ya existe una categoría con el nombre: " + nombreNormalizado);
        }
        CategoriaProducto guardada = categoriaProductoRepository.save(
                CategoriaProducto.builder().nombre(nombreNormalizado).activo(true).build()
        );
        log.info("Categoría de producto creada: {}", guardada.getNombre());
        return guardada;
    }

    @Transactional(readOnly = true)
    public List<CategoriaProducto> listarTodas() {
        return categoriaProductoRepository.findAllByOrderByNombreAsc();
    }

    @Transactional
    public CategoriaProducto actualizar(Long id, String nombre, Boolean activo) {
        CategoriaProducto categoria = buscarPorId(id);
        String nombreNormalizado = normalizarNombre(nombre);
        if (!categoria.getNombre().equals(nombreNormalizado)
                && categoriaProductoRepository.existsByNombreIgnoreCase(nombreNormalizado)) {
            throw new DuplicateResourceException("Ya existe una categoría con el nombre: " + nombreNormalizado);
        }
        categoria.setNombre(nombreNormalizado);
        if (activo != null) {
            categoria.setActivo(activo);
        }
        CategoriaProducto guardada = categoriaProductoRepository.save(categoria);
        log.info("Categoría actualizada: {} (ID: {}) - activo: {}", guardada.getNombre(), guardada.getId(), guardada.isActivo());
        return guardada;
    }

    @Transactional
    public void eliminar(Long id) {
        CategoriaProducto categoria = buscarPorId(id);
        categoria.setActivo(false);
        categoriaProductoRepository.save(categoria);
        log.info("Categoría ID {} marcada como inactiva.", id);
    }

    @Transactional(readOnly = true)
    public CategoriaProducto resolverPorId(Long id) {
        CategoriaProducto categoria = buscarPorId(id);
        if (!categoria.isActivo()) {
            throw new IllegalArgumentException("La categoría seleccionada no está activa.");
        }
        return categoria;
    }

    private String normalizarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre de la categoría es obligatorio.");
        }
        String trimmed = nombre.trim();
        if (!trimmed.matches("[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+")) {
            throw new IllegalArgumentException("El nombre de la categoría solo puede contener letras y espacios.");
        }
        return trimmed.toUpperCase();
    }
}
