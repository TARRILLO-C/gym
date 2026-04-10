package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad que representa la cabecera de una Venta de productos en el gimnasio.
 */
@Entity
@Table(name = "ventas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Socio que realiza la compra (opcional, permite ventas al público general).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "socio_id")
    @JsonIgnoreProperties({"suscripciones", "asistencias", "hibernateLazyInitializer", "handler"})
    private Socio socio;

    /**
     * Fecha y hora en que se realizó la transacción.
     */
    @Column(name = "fecha", nullable = false)
    @Builder.Default
    private LocalDateTime fecha = LocalDateTime.now();

    /**
     * Monto total de la venta (suma de subtotales de los detalles).
     */
    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    /**
     * Método utilizado para el pago.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false)
    private MetodoPago metodoPago;

    /**
     * Tipo de comprobante electrónico emitido.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_comprobante", nullable = false)
    private TipoComprobante tipoComprobante;

    /**
     * Serie del comprobante (ej: B001, F001).
     */
    @Column(name = "serie", length = 4)
    private String serie;

    /**
     * Número correlativo del comprobante.
     */
    @Column(name = "correlativo")
    private Integer correlativo;

    /**
     * Código hash de la firma digital (obligatorio para SUNAT).
     */
    @Column(name = "codigo_hash", length = 100)
    private String codigoHash;

    /**
     * Estado del envío a SUNAT.
     */
    @Column(name = "estado_sunat")
    private String estadoSunat;

    /**
     * Nombre o razón social ingresado manualmente para el comprobante.
     */
    @Column(name = "cliente_nombre")
    private String clienteNombre;

    /**
     * DNI o RUC ingresado manualmente para el comprobante.
     */
    @Column(name = "cliente_documento", length = 20)
    private String clienteDocumento;

    /**
     * Enlaces directos hacia los PDFs generados por miapi.cloud
     */
    @Column(name = "enlace_pdf_ticket", length = 500)
    private String enlacePdfTicket;

    @Column(name = "enlace_pdf_a4", length = 500)
    private String enlacePdfA4;

    @Column(name = "enlace_xml_sin_firmar", length = 500)
    private String enlaceXmlSinFirmar;

    @Column(name = "enlace_xml_firmado", length = 500)
    private String enlaceXmlFirmado;

    /**
     * Lista de productos incluidos en esta venta.
     */
    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DetalleVenta> detalles = new ArrayList<>();

    public void addDetalle(DetalleVenta detalle) {
        detalles.add(detalle);
        detalle.setVenta(this);
    }

    public enum MetodoPago {
        EFECTIVO,
        TARJETA,
        TRANSFERENCIA,
        YAPE_PLIN
    }

    public enum TipoComprobante {
        BOLETA,
        FACTURA,
        NOTA_VENTA // Comprobante interno sin valor legal
    }
}
