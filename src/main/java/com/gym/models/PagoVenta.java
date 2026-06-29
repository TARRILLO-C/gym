package com.gym.models;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Registro de un método de pago individual para una Venta.
 * Una venta puede tener múltiples PagoVenta (pagos mixtos).
 * Ejemplo: S/30 EFECTIVO + S/70 YAPE_PLIN para una venta de S/100.
 */
@Entity
@Table(name = "pagos_venta")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoVenta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Venta venta;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", nullable = false)
    private Venta.MetodoPago metodoPago;

    @Column(name = "monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;
}
