package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Entidad que representa un Producto del punto de venta del gimnasio.
 * Puede incluir suplementos, bebidas, ropa deportiva, etc.
 */
@Entity
@Table(name = "productos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Nombre descriptivo del producto (ej: "Proteína Whey", "Camiseta Dry-fit").
     */
    @NotBlank(message = "El nombre es obligatorio")
    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    /**
     * Categoría del producto para filtros y organización.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "categoria", length = 50)
    private CategoriaProducto categoria;

    /**
     * Descripción larga del producto.
     */
    @Column(name = "descripcion", length = 500)
    private String descripcion;

    /**
     * URL de la imagen del producto para el catálogo visual.
     */
    @Column(name = "imagen_url")
    private String imagenUrl;

    /**
     * Precio de venta del producto.
     */
    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser mayor a 0")
    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    /**
     * Cantidad disponible en inventario.
     * No puede ser negativo; la lógica de negocio lo controlará en el Service.
     */
    @NotNull(message = "El stock es obligatorio")
    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(name = "stock", nullable = false)
    private Integer stock;

    /**
     * Indica si el producto está activo (borrado lógico).
     */
    @Builder.Default
    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    public enum CategoriaProducto {
        BEBIDA,
        SUPLEMENTO,
        ACCESORIO,
        ROPA,
        OTRO
    }
}
