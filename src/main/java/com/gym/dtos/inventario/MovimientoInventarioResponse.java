package com.gym.dtos.inventario;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class MovimientoInventarioResponse {
    private Long id;
    private Long productoId;
    private String productoNombre;
    private String categoria;
    private BigDecimal precio;
    private String tipo;
    private Integer cantidad;
    private Integer stockAnterior;
    private Integer stockNuevo;
    private String motivo;
    private String referencia;
    private LocalDateTime fechaCreacion;
}
