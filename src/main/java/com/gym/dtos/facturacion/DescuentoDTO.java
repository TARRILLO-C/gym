package com.gym.dtos.facturacion;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class DescuentoDTO {
    private String motivoCodigo;
    private BigDecimal factor;
    private BigDecimal monto;
    private BigDecimal base;
}
