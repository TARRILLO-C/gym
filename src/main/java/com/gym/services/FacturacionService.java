package com.gym.services;

import com.gym.dtos.facturacion.*;
import com.gym.models.Venta;
import com.gym.models.Venta.TipoComprobante;
import com.gym.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

/**
 * Servicio encargado de la comunicación real con la API de miapi.cloud.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FacturacionService {

    private final VentaRepository ventaRepository;
    private final RestTemplate restTemplate;

    @Value("${facturacion.api.url}")
    private String apiUrl;

    @Value("${facturacion.api.key}")
    private String apiKey;

    @Value("${consulta.api.token}")
    private String tokenJwt;

    /**
     * Procesa una venta y la envía a la API Cloud.
     */
    @Transactional
    public void procesarComprobante(Venta venta) {
        if (venta.getTipoComprobante() == TipoComprobante.NOTA_VENTA) {
            log.info("Venta ID {} es Nota de Venta interna.", venta.getId());
            return;
        }

        try {
            // 1. Numeración local
            asignarNumeracion(venta);

            // 2. Mapeo a DTO de la API
            FacturacionRequest request = mapearAVentaRequest(venta);

            // 3. Llamada HTTP
            log.info("Enviando comprobante {}-{} a la API cloud...", venta.getSerie(), venta.getCorrelativo());
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + tokenJwt);
            // application/json is set by default for objects, but we can be explicit if we want.
            org.springframework.http.HttpEntity<FacturacionRequest> entity = new org.springframework.http.HttpEntity<>(request, headers);

            org.springframework.http.ResponseEntity<FacturacionApiResponse> responseEntity = restTemplate.exchange(
                    apiUrl,
                    org.springframework.http.HttpMethod.POST,
                    entity,
                    FacturacionApiResponse.class
            );
            
            FacturacionApiResponse response = responseEntity.getBody();
            
            log.info("Respuesta de API recibida: {}", response);

            // 4. Actualizar estado y asignar enlaces completos
            if (response != null && response.getRespuesta() != null) {
                venta.setEnlacePdfTicket(response.getRespuesta().getPdfTicket());
                venta.setEnlacePdfA4(response.getRespuesta().getPdfA4());
                venta.setEnlaceXmlSinFirmar(response.getRespuesta().getXmlSinFirmar());
                venta.setEnlaceXmlFirmado(response.getRespuesta().getXmlFirmado());
                
                venta.setCodigoHash("API_SUCCESS_" + java.util.UUID.randomUUID().toString().substring(0,8));
                venta.setEstadoSunat(Boolean.TRUE.equals(response.getRespuesta().getSuccess()) ? "ACEPTADO" : "OBSERVADO");
            } else {
                venta.setEstadoSunat("ERROR_API");
            }
        } catch (Exception e) {
            log.error("Error al comunicar con la API de facturación: {}", e.getMessage());
            venta.setEstadoSunat("ERROR_API");
        }
    }

    private void asignarNumeracion(Venta venta) {
        String serie = (venta.getTipoComprobante() == TipoComprobante.BOLETA) ? "B001" : "F001";
        venta.setSerie(serie);

        Integer ultimoCorrelativo = ventaRepository.findFirstBySerieOrderByCorrelativoDesc(serie)
                .map(Venta::getCorrelativo)
                .orElse(0);
        venta.setCorrelativo(ultimoCorrelativo + 1);
    }

    private FacturacionRequest mapearAVentaRequest(Venta venta) {
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

        ComprobanteDTO comprobante = ComprobanteDTO.builder()
                .tipoOperacion("0101")
                .tipoDoc(venta.getTipoComprobante() == TipoComprobante.FACTURA ? "01" : "03")
                .serie(venta.getSerie())
                .correlativo(String.valueOf(venta.getCorrelativo()))
                .fechaEmision(venta.getFecha().format(dateFormatter))
                .horaEmision(venta.getFecha().format(timeFormatter))
                .tipoMoneda("PEN")
                .tipoPago("Contado")
                .observacion("Venta desde Gym Management System")
                .build();

        String documento = venta.getClienteDocumento();
        String nombre = venta.getClienteNombre();

        // Si no hay datos manuales, intentar obtenerlos del socio
        if ((documento == null || documento.isBlank()) && venta.getSocio() != null) {
            documento = (venta.getTipoComprobante() == TipoComprobante.FACTURA) ? 
                         venta.getSocio().getRuc() : venta.getSocio().getDni();
        }
        if ((nombre == null || nombre.isBlank()) && venta.getSocio() != null) {
            nombre = (venta.getTipoComprobante() == TipoComprobante.FACTURA) ? 
                      venta.getSocio().getRazonSocial() : venta.getSocio().getNombreCompleto();
        }

        // Valores por defecto si todo falla
        if (documento == null || documento.isBlank()) documento = "00000000";
        if (nombre == null || nombre.isBlank()) nombre = "PÚBLICO GENERAL";

        ClienteDTO cliente = ClienteDTO.builder()
                .codigoPais("PE")
                .tipoDoc(venta.getTipoComprobante() == TipoComprobante.FACTURA ? "6" : "1")
                .numDoc(documento)
                .rznSocial(nombre)
                .direccion("LIMA")
                .build();

        java.util.List<ItemDTO> items = venta.getDetalles().stream().map(d -> {
            BigDecimal totalItem = d.getSubtotal();
            BigDecimal baseIgv = totalItem.divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);
            BigDecimal igv = totalItem.subtract(baseIgv);
            BigDecimal valorUnitario = d.getPrecioUnitario().divide(new BigDecimal("1.18"), 2, RoundingMode.HALF_UP);

            return ItemDTO.builder()
                    .codProducto("P" + d.getProducto().getId())
                    .descripcion(d.getProducto().getNombre())
                    .unidad("NIU")
                    .cantidad(BigDecimal.valueOf(d.getCantidad()))
                    .mtoBaseIgv(baseIgv)
                    .mtoValorUnitario(valorUnitario)
                    .mtoPrecioUnitario(d.getPrecioUnitario())
                    .codeAfect("10") // Gravado - Operación Onerosa
                    .igvPorcent(new BigDecimal("18"))
                    .igv(igv)
                    .build();
        }).collect(Collectors.toList());

        return FacturacionRequest.builder()
                .claveSecreta(apiKey)
                .comprobante(comprobante)
                .cliente(cliente)
                .items(items)
                .descuentos(new java.util.ArrayList<>()) // Agregado para cumplir estructura JSON
                .build();
    }
}
