package com.gym.models;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "solicitudes_membresia")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudMembresia {
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
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "membresia_id", nullable = false)
    private Membresia membresia;
    @Column(name = "comprobante_url", length = 500)
    private String comprobanteUrl;
    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    @Builder.Default
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;
    @Column(name = "fecha_solicitud", nullable = false)
    private LocalDateTime fechaSolicitud;
    @PrePersist
    protected void onCreate() {
        fechaSolicitud = LocalDateTime.now();
        if (estado == null) {
            estado = EstadoSolicitud.PENDIENTE;
        }
    }
    public String getMembresiaNombre() {
        return membresia != null ? membresia.getNombre() : null;
    }
    public enum EstadoSolicitud {
        PENDIENTE,
        APROBADA,
        RECHAZADA
    }
}