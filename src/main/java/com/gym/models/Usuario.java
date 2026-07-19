package com.gym.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Entidad JPA que representa a los usuarios (personal) del gimnasio. Mapea la tabla 'usuarios'.
 */
@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "password")
public class Usuario extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre de usuario es obligatorio")
    @Column(nullable = false, unique = true)
    private String username;

    @NotBlank(message = "La contraseña es obligatoria")
    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password; 

    /**
     * Relación Many-to-One con la entidad Rol.
     * Carga tipo EAGER para tener la información del rol disponible inmediatamente en la sesión de autenticación.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol rol;
    
    @Builder.Default
    @Column(nullable = false)
    private boolean activo = true;

    @Builder.Default
    @Column(name = "intentos_fallidos", columnDefinition = "int default 0", nullable = false)
    private int intentosFallidos = 0;

    /** PIN hasheado para operaciones sensibles (anulaciones, retiros de fondos) */
    @Column(name = "pin_admin", length = 64)
    private String pinAdmin;

    @Transient
    private String currentPinAdmin;
}
