package com.gym.dtos;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class SolicitudMembresiaDTO {
    private Long id;
    private String nombreCompleto;
    private String dni;
    private String telefono;
    private String email;
    private Long membresiaId;
    private String membresiaNombre;
    private String comprobanteUrl;
    private String numeroOperacion;
    private LocalDateTime fechaSolicitud;
    private String estado;
}
