package com.gym.services;

import com.gym.models.Pago;
import com.gym.models.Suscripcion;
import com.gym.repositories.PagoRepository;
import com.gym.repositories.SuscripcionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagoService {

    private final PagoRepository pagoRepository;
    private final SuscripcionRepository suscripcionRepository;

    @Transactional
    public Pago registrarPago(Long suscripcionId, Pago pago) {
        if (suscripcionId == null) {
            throw new IllegalArgumentException("El ID de la suscripción no puede ser nulo");
        }
        Suscripcion sus = suscripcionRepository.findById(suscripcionId)
                .orElseThrow(() -> new RuntimeException("Suscripción no encontrada"));

        pago.setSuscripcion(sus);
        if (pago.getFechaPago() == null) {
            pago.setFechaPago(LocalDateTime.now());
        }

        // Si es un pago fraccionado, extender la fecha de próximo cobro
        if (sus.getMembresia().getPrecioCuota() != null && sus.getFechaProximoCobro() != null && sus.getMembresia().getFrecuenciaCobroDias() != null) {
            sus.setFechaProximoCobro(sus.getFechaProximoCobro().plusDays(sus.getMembresia().getFrecuenciaCobroDias()));
            // Asegurarse de no exceder la fecha de fin de la suscripción
            if (sus.getFechaProximoCobro().isAfter(sus.getFechaFin())) {
                sus.setFechaProximoCobro(sus.getFechaFin());
            }
        }

        suscripcionRepository.save(sus);
        Pago guardado = pagoRepository.save(pago);
        log.info("Pago registrado para suscripción {}: {}", suscripcionId, guardado.getMonto());
        return guardado;
    }

    public List<Pago> listarPorSuscripcion(Long suscripcionId) {
        return pagoRepository.findBySuscripcionId(suscripcionId);
    }
    
    public List<Pago> listarPorSocio(Long socioId) {
        return pagoRepository.findBySuscripcionSocioId(socioId);
    }
}
