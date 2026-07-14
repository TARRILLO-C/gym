       package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "socios")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Socio extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(max = 150, message = "El nombre no puede exceder los 150 caracteres")
    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    @NotBlank(message = "El DNI es obligatorio")
    @Size(min = 8, max = 15, message = "El DNI debe tener entre 8 y 15 caracteres")
    @Column(name = "dni", nullable = false, unique = true, length = 8)
    private String dni;

    @Column(name = "ruc", length = 11, unique = true)
    private String ruc;

    @Column(name = "razon_social", length = 200)
    private String razonSocial;

    @Pattern(regexp = "^[0-9]{9}$", message = "El teléfono debe tener exactamente 9 dígitos")
    @Column(name = "telefono", length = 15)
    private String telefono;

    @Email(message = "El formato de correo electrónico no es válido")
    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoSocio estado;

    @Lob
    @Column(name = "face_descriptor", columnDefinition = "LONGTEXT")
    private String faceDescriptor;

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
    // ── PrePersist & PreUpdate ───────────────────────────────────────────────

    @PrePersist
    @PreUpdate
    public void sanitizeEmptyStringsToNull() {
        if (this.ruc != null && this.ruc.trim().isEmpty()) {
            this.ruc = null;
        }
        if (this.email != null && this.email.trim().isEmpty()) {
            this.email = null;
        }
    }
}
