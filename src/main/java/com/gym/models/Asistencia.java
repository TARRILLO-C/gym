package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

/**
 * Entidad que registra el control de acceso (asistencia) de un Socio al gimnasio.
 * Cada vez que un socio ingresa, se genera un registro con fecha y hora exacta.
 */
@Entity
@Table(name = "asistencias")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Socio que realizó el ingreso.
     * Relación ManyToOne: muchas asistencias → un socio.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "socio_id", nullable = false)
    @JsonIgnoreProperties({"asistencias", "suscripciones", "hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Socio socio;

    /**
     * Fecha y hora exacta del ingreso al gimnasio.
     * Se asigna automáticamente en el momento de la persistencia.
     */
    @Column(name = "fecha_hora_ingreso", nullable = false)
    private LocalDateTime fechaHoraIngreso;

    // ── Callback de ciclo de vida ─────────────────────────────────────────────

    /**
     * Se ejecuta antes de persistir: asigna la fecha/hora actual si no fue provista.
     */
    @PrePersist
    public void prePersist() {
        if (this.fechaHoraIngreso == null) {
            this.fechaHoraIngreso = LocalDateTime.now();
        }
    }
}
