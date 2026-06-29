package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Movimiento de salida de efectivo de una sesión de caja.
 * Reemplaza la tabla `egresos` anterior.
 * EGRESO = gasto operativo | RETIRO_FONDOS = traslado a caja fuerte (solo admin)
 */
@Entity
@Table(name = "movimientos_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sesion_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private SesionCaja sesion;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private TipoMovimiento tipo;

    @Column(name = "descripcion", nullable = false, length = 255)
    private String descripcion;

    @Column(name = "monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(name = "username", nullable = false, length = 100)
    private String username;

    /** Solo para RETIRO_FONDOS: quién autorizó (debe ser admin) */
    @Column(name = "autorizado_por", length = 100)
    private String autorizadoPor;

    @Column(name = "fecha", nullable = false)
    @Builder.Default
    private LocalDateTime fecha = LocalDateTime.now();

    public enum TipoMovimiento {
        EGRESO,         // Gasto operativo: limpieza, agua, etc.
        RETIRO_FONDOS   // Traslado contable a caja fuerte o banco
    }
}
