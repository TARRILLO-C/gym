package com.gym.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;

/**
 * Representa un producto individual dentro de una Venta.
 */
@Entity
@Table(name = "detalle_ventas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetalleVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonIgnore
    private Venta venta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Producto producto;

    /**
     * Cantidad de unidades vendidas.
     */
    @Column(name = "cantidad", nullable = false)
    @Min(value = 1, message = "La cantidad debe ser al menos 1")
    private Integer cantidad;

    /**
     * Precio unitario al momento de la venta (para histórico).
     */
    @Column(name = "precio_unitario", nullable = false, precision = 10, scale = 2)
    @PositiveOrZero(message = "El precio unitario no puede ser negativo")
    private BigDecimal precioUnitario;

    /**
     * Subtotal calculado (cantidad * precio_unitario).
     */
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    @PositiveOrZero(message = "El subtotal no puede ser negativo")
    private BigDecimal subtotal;
}
