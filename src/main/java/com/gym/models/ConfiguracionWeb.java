package com.gym.models;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "configuracion_web")
@Data
public class ConfiguracionWeb {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "whatsapp_number")
    private String whatsappNumber;

    @Column(name = "yape_number", length = 9)
    private String yapeNumber;

    @Column(name = "yape_nombre")
    private String yapeNombre;

    @Column(name = "cci_number")
    private String cciNumber;

    // We can add other fields in the future like site name, primary color, etc.
}
