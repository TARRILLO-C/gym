package com.gym.models;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "slider_web")
@Data
public class SliderWeb {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "imagen_url", nullable = false)
    private String imagenUrl;

    @Column(name = "titulo")
    private String titulo;

    @Column(name = "descripcion", length = 500)
    private String descripcion;

    @Column(name = "enlace_url")
    private String enlaceUrl;

    @Column(name = "texto_boton")
    private String textoBoton;
}
