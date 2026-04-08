package com.gym.models;

import jakarta.persistence.*;
import lombok.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

/**
 * Entidad que representa un tipo de Membresía disponible en el gimnasio.
 * Ejemplo: Mensual, Trimestral, Anual.
 */
@Entity
@Table(name = "membresias")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Membresia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Nombre descriptivo del plan (ej: "Mensual", "Anual", "Trimestral").
     */
    @Column(name = "nombre", nullable = false, unique = true, length = 100)
    private String nombre;

    /**
     * Precio de la membresía expresado con precisión decimal.
     */
    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    /**
     * Monto sugerido para cobro mensual (útil para planes largos).
     */
    @Column(name = "precio_mensual", precision = 10, scale = 2)
    private BigDecimal precioMensual;

    /**
     * Duración en días que otorga esta membresía (ej: 30, 90, 365).
     */
    @Column(name = "duracion_dias", nullable = false)
    private Integer duracionDias;

    /**
     * Breve descripción del plan.
     */
    @Column(name = "descripcion", length = 255)
    private String descripcion;

    /**
     * Estado actual de la membresía en el catálogo.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoMembresia estado;

    // ── Enum de estado de membresía ──────────────────────────────────────────

    public enum EstadoMembresia {
        DISPONIBLE,
        OCULTO
    }
}
