package com.gym.repositories;

import com.gym.models.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repositorio JPA para la entidad Venta.
 */
@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    /**
     * Retorna todas las ventas realizadas por un socio.
     */
    List<Venta> findBySocioId(Long socioId);

    /**
     * Retorna las ventas realizadas en un rango de fechas (para reportes).
     */
    List<Venta> findByFechaBetween(LocalDateTime inicio, LocalDateTime fin);

    /**
     * Obtiene la última venta de una serie específica para calcular el siguiente correlativo.
     */
    java.util.Optional<Venta> findFirstBySerieOrderByCorrelativoDesc(String serie);

    /**
     * Ventas de productos: excluye las generadas al registrar pagos de suscripción/membresía.
     */
    @Query("SELECT DISTINCT v FROM Venta v "
            + "LEFT JOIN FETCH v.detalles d "
            + "LEFT JOIN FETCH d.producto "
            + "LEFT JOIN FETCH v.socio "
            + "WHERE NOT EXISTS (SELECT 1 FROM Pago p WHERE p.venta = v) "
            + "ORDER BY v.fecha DESC")
    List<Venta> findVentasDeProductos();

    @Query("SELECT DISTINCT v FROM Venta v "
            + "LEFT JOIN FETCH v.detalles d "
            + "LEFT JOIN FETCH d.producto "
            + "WHERE v.id = :id")
    Optional<Venta> findByIdWithDetalles(Long id);

    /**
     * Suma del efectivo generado en una sesión (solo ventas válidas).
     */
    @Query("SELECT COALESCE(SUM(v.totalEfectivo), 0) FROM Venta v " +
           "WHERE v.sesion.id = :sesionId AND v.activo = true")
    java.math.BigDecimal sumEfectivoBySesion(Long sesionId);

    /**
     * Resumen de ingresos de una sesión agrupado por método de pago
     * (basado en pagos_venta para soportar pagos mixtos).
     */
    @Query("SELECT pv.metodoPago, COALESCE(SUM(pv.monto), 0) " +
           "FROM PagoVenta pv WHERE pv.venta.sesion.id = :sesionId " +
           "AND pv.venta.activo = true GROUP BY pv.metodoPago")
    List<Object[]> findResumenMetodosBySesion(Long sesionId);

    /**
     * Consulta legado: resumen por rango de fechas (para MonitorCaja).
     */
    @Query("SELECT pv.metodoPago, COALESCE(SUM(pv.monto), 0) " +
           "FROM PagoVenta pv " +
           "WHERE pv.venta.fecha BETWEEN :inicio AND :fin AND pv.venta.activo = true " +
           "GROUP BY pv.metodoPago")
    List<Object[]> findResumenMetodos(LocalDateTime inicio, LocalDateTime fin);
}
