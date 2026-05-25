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

    // We can add other fields in the future like site name, primary color, etc.
}
