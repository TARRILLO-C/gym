package com.gym.repositories;

import com.gym.models.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio JPA para la entidad {@link Producto}.
 * Gestiona el inventario del punto de venta del gimnasio.
 */
@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {

    /**
     * Busca productos cuyo nombre contenga el texto dado (case-insensitive).
     *
     * @param nombre fragmento del nombre a buscar
     * @return lista de productos que coinciden
     */
    List<Producto> findByNombreContainingIgnoreCase(String nombre);

    /**
     * Retorna todos los productos que aún tienen stock disponible (stock > 0).
     * Útil para mostrar solo los productos vendibles en el punto de venta.
     *
     * @return lista de productos con stock positivo
     */
    List<Producto> findByStockGreaterThan(Integer stock);

    /**
     * Retorna productos con stock igual o menor al mínimo indicado.
     * Útil para alertas de reabastecimiento.
     *
     * @param stockMinimo umbral mínimo de stock
     * @return lista de productos con stock bajo
     */
    List<Producto> findByStockLessThanEqual(Integer stockMinimo);

    /**
     * Retorna productos por categoría.
     */
    List<Producto> findByCategoria(Producto.CategoriaProducto categoria);
}
