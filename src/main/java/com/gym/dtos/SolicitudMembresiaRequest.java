package com.gym.dtos;
import lombok.Data;
@Data
public class SolicitudMembresiaRequest {
    private String dni;
    private String nombreCompleto;
    private String telefono;
    private String email;
    private String numeroOperacion;
    private Long membresiaId;
    private String comprobanteUrl;
}
