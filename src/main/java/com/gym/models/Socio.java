package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.util.List;

/**
 * Entidad que representa a un Socio del gimnasio.
 * Un socio puede tener múltiples suscripciones y registros de asistencia.
 */
@Entity
@Table(name = "socios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Socio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    @Column(name = "dni", nullable = false, unique = true, length = 8)
    private String dni;

    @Column(name = "ruc", length = 11, unique = true)
    private String ruc;

    @Column(name = "razon_social", length = 200)
    private String razonSocial;

    @Column(name = "telefono", length = 15)
    private String telefono;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoSocio estado;

    // ── Relaciones ──────────────────────────────────────────────────────────

    /**
     * Un socio puede tener muchas suscripciones a lo largo del tiempo.
     * mappedBy apunta al campo "socio" dentro de la entidad Suscripcion.
     */
    @OneToMany(mappedBy = "socio", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"socio", "hibernateLazyInitializer", "handler"})
    @ToString.Exclude   // evita recursión infinita en toString()
    @EqualsAndHashCode.Exclude
    private List<Suscripcion> suscripciones;

    /**
     * Un socio puede tener muchos registros de asistencia.
     */
    @OneToMany(mappedBy = "socio", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"socio", "hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Asistencia> asistencias;

    // ── Enum de estado ───────────────────────────────────────────────────────

    public enum EstadoSocio {
        ACTIVO,
        INACTIVO
    }
}
