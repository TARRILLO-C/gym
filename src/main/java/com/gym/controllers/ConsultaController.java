package com.gym.controllers;

import com.gym.dtos.consulta.ConsultaResponse;
import com.gym.services.ConsultaService;
import com.gym.services.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/consultas")
@RequiredArgsConstructor
public class ConsultaController {

    private final ConsultaService consultaService;
    private final RateLimiterService rateLimiterService;
    private final HttpServletRequest request;

    @GetMapping("/dni/{numero}")
    public ResponseEntity<?> consultarDni(@PathVariable String numero) {
        if (numero == null || numero.length() != 8) {
            return ResponseEntity.badRequest().build();
        }

        String clientIp = getClientIP(request);
        if (!rateLimiterService.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Has superado el límite de consultas permitidas. Por favor, intenta más tarde.");
        }

        return ResponseEntity.ok(consultaService.consultarDni(numero));
    }

    @GetMapping("/ruc/{numero}")
    public ResponseEntity<?> consultarRuc(@PathVariable String numero) {
        if (numero == null || numero.length() != 11) {
            return ResponseEntity.badRequest().build();
        }

        String clientIp = getClientIP(request);
        if (!rateLimiterService.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Has superado el límite de consultas permitidas. Por favor, intenta más tarde.");
        }

        return ResponseEntity.ok(consultaService.consultarRuc(numero));
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
