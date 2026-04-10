package com.gym.dtos.facturacion;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComprobanteDTO {
    private String tipoOperacion;
    private String tipoDoc;
    private String serie;
    private String correlativo;
    private String fechaEmision;
    private String horaEmision;
    private String tipoMoneda;
    private String tipoPago;
    private String observacion;
}
