package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.Producto;
import com.gym.repositories.ProductoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de negocio para la entidad {@link Producto}.
 * Gestiona el inventario del punto de venta del gimnasio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductoService {

    private final ProductoRepository productoRepository;

    @Transactional(readOnly = true)
    public List<Producto> listarTodos() {
        return productoRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto", id));
    }

    /**
     * Retorna solo los productos con stock disponible (stock > 0).
     */
    @Transactional(readOnly = true)
    public List<Producto> listarConStock() {
        return productoRepository.findByStockGreaterThan(0);
    }

    /**
     * Retorna productos con stock bajo (≤ umbral dado).
     */
    @Transactional(readOnly = true)
    public List<Producto> alertaStockBajo(int umbral) {
        return productoRepository.findByStockLessThanEqual(umbral);
    }

    @Transactional
    public Producto crear(Producto producto) {
        Producto guardado = productoRepository.save(producto);
        log.info("Producto creado: {} (stock: {})", guardado.getNombre(), guardado.getStock());
        return guardado;
    }

    @Transactional
    public Producto actualizar(Long id, Producto datos) {
        Producto existente = buscarPorId(id);
        existente.setNombre(datos.getNombre());
        existente.setPrecio(datos.getPrecio());
        existente.setStock(datos.getStock());
        existente.setCategoria(datos.getCategoria());
        existente.setDescripcion(datos.getDescripcion());
        existente.setImagenUrl(datos.getImagenUrl());
        existente.setActivo(datos.isActivo());
        return productoRepository.save(existente);
    }

    @Transactional
    public void eliminar(Long id) {
        Producto p = buscarPorId(id);
        p.setActivo(false);
        productoRepository.save(p);
        log.info("Producto ID {} marcado como inactivo (borrado lógico).", id);
    }
}
