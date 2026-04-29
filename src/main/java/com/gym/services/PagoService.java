package com.gym.services;

import com.gym.models.Pago;
import com.gym.models.Suscripcion;
import com.gym.repositories.PagoRepository;
import com.gym.repositories.SuscripcionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

        // Actualizar estado financiero de la suscripción a PAGADO
        sus.setEstadoPago(Suscripcion.EstadoPago.PAGADO);

        // Actualizar la fecha del próximo cobro y extender contratos pasados implícitamente
        Integer cobroDias = sus.getMembresia().getFrecuenciaCobroDias();
        Integer duracionDias = sus.getMembresia().getDuracionDias();

        // Es un contrato fraccionado SOLO si la duración total excede la frecuencia de cobro
        if (cobroDias != null && cobroDias > 0 && duracionDias != null && duracionDias > cobroDias) {
            // El ciclo de cobro avanza estrictamente basado en su último vencimiento (para no perdonar días si pagan tarde)
            LocalDate baseLine = sus.getFechaProximoCobro() != null ? sus.getFechaProximoCobro() : LocalDate.now();
            LocalDate nextCobro = baseLine.plusDays(cobroDias);
            
            // Si el próximo cobro supera o es igual a la fecha final del contrato, significa que canceló su última cuota.
            if (sus.getFechaFin() != null && !nextCobro.isBefore(sus.getFechaFin())) {
                sus.setFechaProximoCobro(sus.getFechaFin());
            } else {
                sus.setFechaProximoCobro(nextCobro);
            }
        } else {
            // Plan de Pago Único: Un pago aquí simplemente significa que está completando la deuda de este paquete.
            // En el modelo de Encolamiento, NUNCA debemos extender la fechaFin al cobrar. Se respeta el contrato inicial.
            if (sus.getFechaFin() != null) {
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
