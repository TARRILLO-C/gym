package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Registro de auditoría inmutable de anulaciones de comprobantes.
 * Este registro NUNCA se elimina. Garantiza trazabilidad completa.
 */
@Entity
@Table(name = "log_anulaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogAnulacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sesion_id")
    private SesionCaja sesion;

    @Column(name = "motivo", nullable = false, length = 500)
    private String motivo;

    /** Username del administrador que autorizó la anulación */
    @Column(name = "anulado_por", nullable = false, length = 100)
    private String anuladoPor;

    /** Cuánto efectivo se devolvió a la caja (solo la parte en efectivo de la venta) */
    @Column(name = "monto_devuelto_efectivo", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal montoDevueltoEfectivo = BigDecimal.ZERO;

    @Column(name = "fecha", nullable = false)
    @Builder.Default
    private LocalDateTime fecha = LocalDateTime.now();
}
