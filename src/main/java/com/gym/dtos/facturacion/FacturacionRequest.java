package com.gym.dtos.facturacion;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FacturacionRequest {
    private String claveSecreta;
    private ComprobanteDTO comprobante;
    private ClienteDTO cliente;
    private List<ItemDTO> items;
    private List<DescuentoDTO> descuentos;
}
