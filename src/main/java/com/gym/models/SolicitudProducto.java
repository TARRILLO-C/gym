package com.gym.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "solicitudes_producto")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "venta"})
public class SolicitudProducto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "dni", nullable = false, length = 15)
    private String dni;
    
    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;
    
    @Column(name = "telefono", length = 15)
    private String telefono;
    
    @Column(name = "email", length = 150)
    private String email;
    
    @Column(name = "numero_operacion", length = 50)
    private String numeroOperacion;
    
    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total;
    
    @Column(name = "comprobante_url", length = 500)
    private String comprobanteUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    @Builder.Default
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;
    
    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Venta venta;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, mappedBy = "solicitudProducto")
    private List<DetalleSolicitudProducto> items;
    
    @PrePersist
    protected void onCreate() {
        fechaSolicitud = LocalDateTime.now();
        if (estado == null) {
            estado = EstadoSolicitud.PENDIENTE;
        }
    }
    
    public enum EstadoSolicitud {
        PENDIENTE,
        APROBADA,
        RECHAZADA,
        ENTREGADO
    }
}


