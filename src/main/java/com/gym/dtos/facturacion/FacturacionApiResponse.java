package com.gym.dtos.facturacion;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FacturacionApiResponse {

    private RespuestaData respuesta;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RespuestaData {
        private Boolean success;
        private Integer status;
        
        @JsonProperty("pdf-a4")
        private String pdfA4;
        
        @JsonProperty("pdf-ticket")
        private String pdfTicket;
        
        private String mensaje;
        
        @JsonProperty("xml-sin-firmar")
        private String xmlSinFirmar;

        @JsonProperty("xml-firmado")
        private String xmlFirmado;
    }
}
