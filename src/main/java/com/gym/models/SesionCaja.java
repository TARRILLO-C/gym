package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa una sesión (turno) de caja.
 * Reemplaza a CierreCaja. Permite múltiples sesiones por día,
 * con la restricción de que solo puede haber UNA en estado ABIERTA a la vez.
 */
@Entity
@Table(name = "sesiones_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SesionCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre del turno (ej: Mañana, Tarde, Noche, General) */
    @Column(name = "turno", nullable = false, length = 50)
    @Builder.Default
    private String turno = "General";

    /** Usuario que abrió la sesión */
    @Column(name = "username", nullable = false, length = 100)
    private String username;

    /** Fecha y hora exacta de apertura (sin restricción de fecha) */
    @Column(name = "apertura_at", nullable = false)
    @Builder.Default
    private LocalDateTime aperturaAt = LocalDateTime.now();

    /** Fecha y hora de cierre (null si está abierta) */
    @Column(name = "cierre_at")
    private LocalDateTime cierreAt;

    /** Monto de efectivo con el que inicia el turno (fondo/sencillo) */
    @Column(name = "monto_inicial", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal montoInicial = BigDecimal.ZERO;

    /** Efectivo calculado internamente por el sistema al cierre (NUNCA se envía al frontend antes de cerrar) */
    @Column(name = "monto_final_esperado", precision = 10, scale = 2)
    private BigDecimal montoFinalEsperado;

    /** Efectivo físico contado por el cajero al cerrar */
    @Column(name = "monto_final_real", precision = 10, scale = 2)
    private BigDecimal montoFinalReal;

    /** Diferencia = montoFinalReal - montoFinalEsperado */
    @Column(name = "diferencia", precision = 10, scale = 2)
    private BigDecimal diferencia;

    /** Fondo que el cajero deja en la gaveta para el siguiente turno */
    @Column(name = "fondo_para_siguiente", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal fondoParaSiguiente = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    @Builder.Default
    private EstadoSesion estado = EstadoSesion.ABIERTA;

    @Column(name = "observaciones", length = 500)
    private String observaciones;

    /** Snapshot JSON del resumen financiero en el momento del cierre */
    @Column(name = "resumen_json", columnDefinition = "TEXT")
    private String resumenJson;

    /** Movimientos de caja (egresos + retiros) de esta sesión */
    @OneToMany(mappedBy = "sesion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MovimientoCaja> movimientos = new ArrayList<>();

    public enum EstadoSesion {
        ABIERTA,
        CUADRADA,   // Diferencia <= 0.50
        FALTANTE,   // Cajero entregó menos de lo esperado
        SOBRANTE    // Cajero entregó más de lo esperado
    }
}
