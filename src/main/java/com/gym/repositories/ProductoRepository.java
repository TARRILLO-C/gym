package com.gym.repositories;

import com.gym.models.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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
     * Retorna solo los productos ACTIVOS con stock disponible.
     * Usado en el catálogo virtual: excluye borrados lógicos (activo=false).
     */
    List<Producto> findByActivoTrueAndStockGreaterThan(Integer stock);

    /**
     * Retorna productos con stock igual o menor al mínimo indicado.
     * Útil para alertas de reabastecimiento.
     *
     * @param stockMinimo umbral mínimo de stock
     * @return lista de productos con stock bajo
     */
    List<Producto> findByStockLessThanEqual(Integer stockMinimo);

    /**
     * Retorna productos por ID de categoría.
     */
    List<Producto> findByCategoria_Id(Long categoriaId);

    /**
     * Busca un producto por su nombre exacto. Usa findFirst para evitar
     * NonUniqueResultException si existen duplicados (por reinicios previos).
     */
    java.util.Optional<Producto> findFirstByNombre(String nombre);

    /**
     * Retorna productos activos con fecha de vencimiento entre el rango dado.
     */
    List<Producto> findByFechaVencimientoBetween(LocalDate start, LocalDate end);

    /**
     * Retorna productos activos cuya fecha de vencimiento ya pasó.
     */
    List<Producto> findByFechaVencimientoBeforeAndActivoTrue(LocalDate date);

    /**
     * Retorna productos activos con fecha de vencimiento asignada, ordenados por fecha ascendente.
     */
    @Query("SELECT p FROM Producto p WHERE p.activo = true AND p.fechaVencimiento IS NOT NULL ORDER BY p.fechaVencimiento ASC")
    List<Producto> findActivosConVencimientoOrderByFecha();
}
