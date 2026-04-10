package com.gym.dtos.consulta;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConsultaResponse {
    // Para DNI
    @com.fasterxml.jackson.annotation.JsonProperty("nombres")
    private String nombres;
    
    @com.fasterxml.jackson.annotation.JsonProperty("ape_paterno")
    private String apellidoPaterno;
    
    @com.fasterxml.jackson.annotation.JsonProperty("ape_materno")
    private String apellidoMaterno;
    
    @com.fasterxml.jackson.annotation.JsonProperty("numero")
    private String numeroDocumento;

    // Para RUC
    @com.fasterxml.jackson.annotation.JsonProperty("razon_social")
    private String razonSocial;
    
    @com.fasterxml.jackson.annotation.JsonProperty("ruc")
    private String ruc;
    
    private String estado;
    private String condicion;
    private String direccion;

    // En caso de que la API envuelva la respuesta en "datos"
    private Boolean success;
    private ConsultaResponse datos;

    // Helper metod para obtener el nombre completo
    public String getNombreCompleto() {
        if (datos != null) {
            return datos.getNombreCompleto();
        }
        if (nombres != null && apellidoPaterno != null) {
            return nombres + " " + apellidoPaterno + (apellidoMaterno != null ? " " + apellidoMaterno : "");
        }
        return razonSocial; // Si es RUC
    }
}

