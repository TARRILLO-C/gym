package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import jakarta.validation.constraints.*;

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
    @NotBlank(message = "El nombre es obligatorio")
    @Column(name = "nombre", nullable = false, unique = true, length = 100)
    private String nombre;

    /**
     * Precio de la membresía expresado con precisión decimal.
     */
    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.0", inclusive = false, message = "El precio debe ser mayor a 0")
    @Column(name = "precio", nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    /**
     * Monto fraccionado para el cobro por cuotas.
     */
    @Column(name = "precio_cuota", precision = 10, scale = 2)
    private BigDecimal precioCuota;

    /**
     * Días que abarca cada ciclo de facturación de la cuota (ej: 7, 15, 30).
     */
    @Column(name = "frecuencia_cobro_dias")
    private Integer frecuenciaCobroDias;

    /**
     * Duración en días que otorga esta membresía (ej: 30, 90, 365).
     */
    @NotNull(message = "La duración es obligatoria")
    @Min(value = 1, message = "La duración debe ser de al menos 1 día")
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
