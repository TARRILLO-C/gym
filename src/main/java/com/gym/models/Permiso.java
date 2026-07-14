package com.gym.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entidad JPA que representa los permisos individuales y granulares del sistema. Mapea la tabla 'permisos'.
 */
@Entity
@Table(name = "permisos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString
public class Permiso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El código del permiso es obligatorio")
    @Size(max = 100, message = "El código del permiso no puede exceder los 100 caracteres")
    @Column(nullable = false, unique = true, length = 100)
    @EqualsAndHashCode.Include
    private String codigo;

    @NotBlank(message = "El nombre del permiso es obligatorio")
    @Size(max = 100, message = "El nombre del permiso no puede exceder los 100 caracteres")
    @Column(nullable = false, length = 100)
    private String nombre;

    @Size(max = 255, message = "La descripción no puede exceder los 255 caracteres")
    @Column(length = 255)
    private String descripcion;

    @NotBlank(message = "El módulo es obligatorio")
    @Size(max = 50, message = "El módulo no puede exceder los 50 caracteres")
    @Column(nullable = false, length = 50)
    private String modulo;
}
