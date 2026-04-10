package com.gym.dtos.facturacion;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClienteDTO {
    private String codigoPais;
    private String tipoDoc;
    private String numDoc;
    private String rznSocial;
    private String direccion;
}
