package com.gym.services;

import com.gym.dtos.SolicitudMembresiaDTO;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.Membresia;
import com.gym.models.Socio;
import com.gym.models.SolicitudMembresia;
import com.gym.models.Suscripcion.EstadoPago;
import com.gym.repositories.MembresiaRepository;
import com.gym.repositories.SocioRepository;
import com.gym.repositories.SolicitudMembresiaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SolicitudMembresiaService {

    private final SolicitudMembresiaRepository solicitudRepository;
    private final SocioRepository socioRepository;
    private final MembresiaRepository membresiaRepository;
    private final SuscripcionService suscripcionService;

    @Transactional
    public SolicitudMembresia crearSolicitud(SolicitudMembresiaDTO dto) {
        Membresia membresia = membresiaRepository.findById(dto.getMembresiaId())
                .orElseThrow(() -> new ResourceNotFoundException("Membresia", dto.getMembresiaId()));

        SolicitudMembresia solicitud = SolicitudMembresia.builder()
                .nombreCompleto(dto.getNombreCompleto())
                .dni(dto.getDni())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .membresia(membresia)
                .comprobanteUrl(dto.getComprobanteUrl())
                .numeroOperacion(dto.getNumeroOperacion())
                .build();

        log.info("Creando solicitud de membresia para DNI: {}", dto.getDni());
        return solicitudRepository.save(solicitud);
    }

    @Transactional(readOnly = true)
    public List<SolicitudMembresia> listarPendientes() {
        return solicitudRepository.findByEstadoOrderByFechaSolicitudDesc(SolicitudMembresia.EstadoSolicitud.PENDIENTE);
    }

    @Transactional(readOnly = true)
    public List<SolicitudMembresia> listarTodas() {
        return solicitudRepository.findAll();
    }

    @Transactional
    public SolicitudMembresia aprobarSolicitud(Long id) {
        SolicitudMembresia solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudMembresia", id));

        if (solicitud.getEstado() != SolicitudMembresia.EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya fue procesada.");
        }

        // Buscar o crear socio
        Optional<Socio> socioOpt = socioRepository.findByDni(solicitud.getDni());
        Socio socio;
        if (socioOpt.isPresent()) {
            socio = socioOpt.get();
            // Actualizar datos si es necesario (opcional)
        } else {
            socio = Socio.builder()
                    .nombreCompleto(solicitud.getNombreCompleto())
                    .dni(solicitud.getDni())
                    .telefono(solicitud.getTelefono())
                    .email(solicitud.getEmail())
                    .estado(Socio.EstadoSocio.ACTIVO)
                    .build();
            socio = socioRepository.save(socio);
            log.info("Nuevo socio creado desde solicitud: {}", socio.getDni());
        }

        // Crear suscripcion y pago (se asume PAGO TOTAL y EFECTIVO/TRANSFERENCIA)
        suscripcionService.crear(
                socio.getId(),
                solicitud.getMembresia().getId(),
                LocalDate.now(),
                EstadoPago.PAGADO,
                true, // pagoTotal
                false, // generarComprobante (NOTA_VENTA por defecto)
                null, // tipoComprobante
                solicitud.getNombreCompleto(),
                solicitud.getDni(),
                "TRANSFERENCIA" // o el metodo real
        );

        solicitud.setEstado(SolicitudMembresia.EstadoSolicitud.APROBADA);
        log.info("Solicitud ID {} APROBADA", id);
        return solicitudRepository.save(solicitud);
    }

    @Transactional
    public SolicitudMembresia rechazarSolicitud(Long id) {
        SolicitudMembresia solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudMembresia", id));

        if (solicitud.getEstado() != SolicitudMembresia.EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya fue procesada.");
        }

        solicitud.setEstado(SolicitudMembresia.EstadoSolicitud.RECHAZADA);
        log.info("Solicitud ID {} RECHAZADA", id);
        return solicitudRepository.save(solicitud);
    }
}
