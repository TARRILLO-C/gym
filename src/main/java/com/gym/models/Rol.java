package com.gym.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.util.Set;

/**
 * Entidad JPA que representa los roles del sistema (e.g., ADMINISTRADOR, RECEPCIONISTA). Mapea la tabla 'roles'.
 */
@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "permisos")
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del rol es obligatorio")
    @Size(max = 100, message = "El nombre del rol no puede exceder los 100 caracteres")
    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Size(max = 255, message = "La descripción no puede exceder los 255 caracteres")
    @Column(length = 255)
    private String descripcion;

    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;

    /**
     * Relación Many-to-Many unidireccional con Permiso.
     * Carga de tipo LAZY por rendimiento, se puede inicializar en servicios transaccionales.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rol_permiso",
        joinColumns = @JoinColumn(name = "rol_id", referencedColumnName = "id"),
        inverseJoinColumns = @JoinColumn(name = "permiso_id", referencedColumnName = "id")
    )
    private Set<Permiso> permisos;
}
