package com.gym.dtos.facturacion;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class ItemDTO {
    private String codProducto;
    private String descripcion;
    private String unidad;
    private BigDecimal cantidad;
    private BigDecimal mtoBaseIgv;
    private BigDecimal mtoValorUnitario;
    private BigDecimal mtoPrecioUnitario;
    private String codeAfect;
    private BigDecimal igvPorcent;
    private BigDecimal igv;
}
