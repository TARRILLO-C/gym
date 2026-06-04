package com.gym.dtos;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class SolicitudProductoRequest {
    private String dni;
    private String nombreCompleto;
    private String telefono;
    private String email;
    private String numeroOperacion;
    private List<ItemSolicitud> items;
    private BigDecimal total;
    private String comprobanteUrl;
    
    @Data
    public static class ItemSolicitud {
        private Long productoId;
        private Integer cantidad;
        private BigDecimal precioUnitario;
    }
}
