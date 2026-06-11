package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.CategoriaProducto;
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
    private final CategoriaProductoService categoriaProductoService;

    @Transactional(readOnly = true)
    public List<Producto> listarTodos() {
        return productoRepository.findAll().stream()
                .filter(p -> !p.getNombre().startsWith("Servicio de Membresía"))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Producto buscarPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto", id));
    }

    /**
     * Retorna solo los productos ACTIVOS con stock disponible (activo=true y stock > 0).
     * Usado en el catálogo virtual para excluir productos dados de baja (borrado lógico).
     */
    @Transactional(readOnly = true)
    public List<Producto> listarConStock() {
        return productoRepository.findByActivoTrueAndStockGreaterThan(0).stream()
                .filter(p -> !p.getNombre().startsWith("Servicio de Membresía"))
                .collect(java.util.stream.Collectors.toList());
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
        aplicarCategoria(producto);
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
        existente.setStockMinimo(datos.getStockMinimo());
        if (datos.getCategoriaId() != null) {
            aplicarCategoria(existente, datos.getCategoriaId());
        }
        existente.setDescripcion(datos.getDescripcion());
        existente.setImagenUrl(datos.getImagenUrl());
        existente.setActivo(datos.isActivo());
        return productoRepository.save(existente);
    }

    private void aplicarCategoria(Producto producto) {
        if (producto.getCategoriaId() == null) {
            throw new IllegalArgumentException("Debe seleccionar una categoría para el producto.");
        }
        aplicarCategoria(producto, producto.getCategoriaId());
    }

    @Transactional
    public Producto guardar(Producto producto) {
        return productoRepository.save(producto);
    }

    private void aplicarCategoria(Producto producto, Long categoriaId) {
        CategoriaProducto categoria = categoriaProductoService.resolverPorId(categoriaId);
        producto.setCategoria(categoria);
        producto.setCategoriaId(categoriaId);
    }

    @Transactional
    public void eliminar(Long id) {
        Producto p = buscarPorId(id);
        p.setActivo(false);
        productoRepository.save(p);
        log.info("Producto ID {} marcado como inactivo (borrado lógico).", id);
    }

    /**
     * Reduce el stock tras una venta o aprobación de solicitud.
     */
    @Transactional
    public Producto descontarStock(Long id, int cantidad) {
        Producto p = buscarPorId(id);
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad a descontar debe ser mayor a cero.");
        }
        if (p.getStock() < cantidad) {
            throw new IllegalStateException("Stock insuficiente para: " + p.getNombre()
                    + " (Pedido: " + cantidad + ", Disponible: " + p.getStock() + ")");
        }
        p.setStock(p.getStock() - cantidad);
        Producto guardado = productoRepository.save(p);
        log.info("Stock descontado: {} (-{}), quedan {}", guardado.getNombre(), cantidad, guardado.getStock());
        return guardado;
    }

    /**
     * Devuelve unidades al inventario (p. ej. al anular una venta).
     */
    @Transactional
    public Producto reponerStock(Long id, int cantidad) {
        Producto p = buscarPorId(id);
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad a reponer debe ser mayor a cero.");
        }
        p.setStock(p.getStock() + cantidad);
        Producto guardado = productoRepository.save(p);
        log.info("Stock repuesto: {} (+{}), total {}", guardado.getNombre(), cantidad, guardado.getStock());
        return guardado;
    }
}
