package com.gym.controllers;

import com.gym.dtos.consulta.ConsultaResponse;
import com.gym.services.ConsultaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/consultas")
@RequiredArgsConstructor
public class ConsultaController {

    private final ConsultaService consultaService;

    @GetMapping("/dni/{numero}")
    public ResponseEntity<ConsultaResponse> consultarDni(@PathVariable String numero) {
        if (numero == null || numero.length() != 8) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(consultaService.consultarDni(numero));
    }

    @GetMapping("/ruc/{numero}")
    public ResponseEntity<ConsultaResponse> consultarRuc(@PathVariable String numero) {
        if (numero == null || numero.length() != 11) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(consultaService.consultarRuc(numero));
    }
}
