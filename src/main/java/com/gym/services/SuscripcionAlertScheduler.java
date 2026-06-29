package com.gym.services;

import com.gym.models.Suscripcion;
import com.gym.repositories.SuscripcionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SuscripcionAlertScheduler {

    private final SuscripcionRepository suscripcionRepository;
    private final EmailService emailService;

    /**
     * Calcula la fecha sumando días hábiles (salta sábados y domingos).
     */
    private LocalDate sumarDiasHabiles(LocalDate fecha, int dias) {
        LocalDate result = fecha;
        int agregados = 0;
        while (agregados < dias) {
            result = result.plusDays(1);
            if (result.getDayOfWeek().getValue() < 6) {
                agregados++;
            }
        }
        return result;
    }

    /**
     * Se ejecuta todos los dias a las 08:00 AM.
     * Busca las suscripciones que vencen exactamente en 5 dias habiles y envia un correo de alerta.
     */
    @Scheduled(cron = "0 0 8 * * ?")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public void verificarYEnviarAlertasDeVencimiento() {
        LocalDate fechaObjetivo = sumarDiasHabiles(LocalDate.now(), 5);
        log.info("Iniciando tarea programada: buscando suscripciones que vencen el {}", fechaObjetivo);

        List<Suscripcion> suscripcionesPorVencer = suscripcionRepository.findByFechaFinAndActivoTrue(fechaObjetivo);

        if (suscripcionesPorVencer.isEmpty()) {
            log.info("No se encontraron suscripciones por vencer para la fecha: {}", fechaObjetivo);
            return;
        }

        log.info("Se encontraron {} suscripciones por vencer. Procediendo a enviar correos...", suscripcionesPorVencer.size());

        for (Suscripcion sus : suscripcionesPorVencer) {
            try {
                emailService.enviarAlertaVencimiento(sus);
            } catch (Exception e) {
                log.error("Error al procesar alerta para suscripcion ID {}: {}", sus.getId(), e.getMessage());
            }
        }

        log.info("Tarea de envio de alertas completada.");
    }
}
