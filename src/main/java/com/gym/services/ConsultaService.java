package com.gym.services;

import com.gym.dtos.consulta.ConsultaResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsultaService {

    private final RestTemplate restTemplate;

    @Value("${consulta.api.dni}")
    private String urlConsultaDni;

    @Value("${consulta.api.ruc}")
    private String urlConsultaRuc;

    @Value("${consulta.api.token}")
    private String token;

    public ConsultaResponse consultarDni(String dni) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            log.info("Consultando DNI {} en API externa...", dni);
            ResponseEntity<ConsultaResponse> response = restTemplate.exchange(
                    urlConsultaDni + dni,
                    HttpMethod.GET,
                    entity,
                    ConsultaResponse.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Error consultando DNI {}: {}", dni, e.getMessage());
            throw new RuntimeException("Error al consultar DNI: Posiblemente el documento no existe o el servicio está caído.");
        }
    }

    public ConsultaResponse consultarRuc(String ruc) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            log.info("Consultando RUC {} en API externa...", ruc);
            ResponseEntity<ConsultaResponse> response = restTemplate.exchange(
                    urlConsultaRuc + ruc,
                    HttpMethod.GET,
                    entity,
                    ConsultaResponse.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Error consultando RUC {}: {}", ruc, e.getMessage());
            throw new RuntimeException("Error al consultar RUC: Posiblemente el documento no existe o el servicio está caído.");
        }
    }
}
