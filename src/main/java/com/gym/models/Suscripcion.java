package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.AssertTrue;

import java.time.LocalDate;

/**
 * Entidad que representa la Suscripción de un Socio a una Membresía.
 * Registra cuándo inicia y vence el acceso del socio, y si está al día en el pago.
 */
@Entity
@Table(name = "suscripciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Suscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Socio al que pertenece esta suscripción.
     * Relación ManyToOne: muchas suscripciones → un socio.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "socio_id", nullable = false)
    @JsonIgnoreProperties({"suscripciones", "asistencias", "hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Socio socio;

    /**
     * Plan de membresía contratado.
     * Relación ManyToOne: muchas suscripciones → una membresía.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membresia_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Membresia membresia;

    /**
     * Fecha en que inicia la vigencia de la suscripción.
     */
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    /**
     * Fecha en que vence la suscripción (calculada al momento del registro).
     */
    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    /**
     * Estado actual del pago de esta suscripción.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false)
    private EstadoPago estadoPago;

    /**
     * Fecha límite para realizar el siguiente cobro mensual (si aplica).
     */
    @Column(name = "fecha_proximo_cobro")
    private LocalDate fechaProximoCobro;

    /**
     * Indica si la suscripción está congelada (pausada).
     */
    @Builder.Default
    @Column(name = "esta_congelada", nullable = false)
    private boolean estaCongelada = false;

    @Builder.Default
    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    // Validación temporal cruzada según reglas de negocio
    @AssertTrue(message = "Fechas inválidas: Vencimiento y Próximo Cobro deben ser estrictamente posteriores a la Fecha de Inicio")
    public boolean isFechasValidas() {
        if (fechaInicio == null) return true;
        if (fechaFin != null && !fechaFin.isAfter(fechaInicio)) return false;
        if (fechaProximoCobro != null && !fechaProximoCobro.isAfter(fechaInicio)) return false;
        return true;
    }

    // ── Enum de estado de pago ────────────────────────────────────────────────

    public enum EstadoPago {
        PAGADO,
        PENDIENTE,
        VENCIDO
    }
}
