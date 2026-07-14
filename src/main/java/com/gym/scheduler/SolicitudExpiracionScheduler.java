package com.gym.scheduler;

import com.gym.models.SolicitudProducto;
import com.gym.repositories.ProductoRepository;
import com.gym.repositories.SolicitudProductoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler encargado de la expiración automática de solicitudes de productos pendientes.
 * Si una solicitud excede las 24 horas sin aprobación, se cancela y se libera su stock reservado.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SolicitudExpiracionScheduler {

    private final SolicitudProductoRepository solicitudProductoRepository;
    private final ProductoRepository productoRepository;

    /**
     * Corre cada hora al inicio de la hora.
     * Busca solicitudes PENDIENTES con más de 24 horas de antigüedad, las marca como RECHAZADAS
     * y repone el stock a los productos correspondientes.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cancelarSolicitudesExpiradas() {
        LocalDateTime limite = LocalDateTime.now().minusHours(24);
        List<SolicitudProducto> expiradas = solicitudProductoRepository.findByEstadoAndFechaSolicitudBefore(
                SolicitudProducto.EstadoSolicitud.PENDIENTE, limite);

        if (!expiradas.isEmpty()) {
            log.info("Iniciando cancelación automática de {} solicitudes expiradas.", expiradas.size());
            for (SolicitudProducto solicitud : expiradas) {
                try {
                    solicitud.setEstado(SolicitudProducto.EstadoSolicitud.RECHAZADA);
                    
                    // Reponer el stock
                    if (solicitud.getItems() != null) {
                        solicitud.getItems().forEach(detalle -> {
                            var producto = detalle.getProducto();
                            producto.setStock(producto.getStock() + detalle.getCantidad());
                            productoRepository.save(producto);
                            log.info("Stock repuesto automáticamente para: {} (+{})", producto.getNombre(), detalle.getCantidad());
                        });
                    }
                    
                    solicitudProductoRepository.save(solicitud);
                    log.info("Solicitud ID {} cancelada automáticamente por inactividad (> 24 horas).", solicitud.getId());
                } catch (Exception e) {
                    log.error("Error al procesar cancelación automática de la solicitud ID {}: ", solicitud.getId(), e);
                }
            }
        }
    }
}
