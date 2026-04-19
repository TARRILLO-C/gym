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
            
            LocalDate baseLine = (sus.getFechaProximoCobro() != null && sus.getFechaProximoCobro().isAfter(LocalDate.now().minusDays(1)))
                                 ? sus.getFechaProximoCobro()
                                 : LocalDate.now();
            
            sus.setFechaProximoCobro(baseLine.plusDays(cobroDias));

            // Renovar automáticamente (extender contrato) si su pago fraccionado supera la fecha fin
            if (sus.getFechaFin() != null && sus.getFechaProximoCobro().isAfter(sus.getFechaFin())) {
                sus.setFechaFin(sus.getFechaProximoCobro());
            }
            
        } else {
            // Plan de Pago Único (ej: Plan diario, o Mensualidad clásica pagada al contado)
            // Si el plan ya expiró en el pasado, arrancamos desde HOY. Si aún tiene días, sumamos a eso.
            LocalDate baseLine = (sus.getFechaFin() != null && sus.getFechaFin().isAfter(LocalDate.now().minusDays(1)))
                                 ? sus.getFechaFin()
                                 : LocalDate.now();
            
            if (duracionDias != null && duracionDias > 0) {
                sus.setFechaFin(baseLine.plusDays(duracionDias));
            }
            // Ya se saldó, no debe nada hasta que acabe este nuevo intervalo de tiempo
            sus.setFechaProximoCobro(sus.getFechaFin());
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
