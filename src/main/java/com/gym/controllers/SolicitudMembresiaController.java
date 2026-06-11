package com.gym.controllers;
import com.gym.dtos.SolicitudMembresiaRequest;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.Membresia;
import com.gym.models.Socio;
import com.gym.models.Suscripcion;
import com.gym.models.SolicitudMembresia;
import com.gym.models.SolicitudMembresia.EstadoSolicitud;
import com.gym.repositories.MembresiaRepository;
import com.gym.repositories.SocioRepository;
import com.gym.repositories.SolicitudMembresiaRepository;
import com.gym.repositories.SolicitudProductoRepository;
import com.gym.services.EmailService;
import com.gym.services.SocioService;
import com.gym.services.SuscripcionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
@RestController
@RequestMapping("/solicitudes-membresia")
@RequiredArgsConstructor
@Slf4j
public class SolicitudMembresiaController {
    private final SolicitudMembresiaRepository solicitudMembresiaRepository;
    private final SolicitudProductoRepository solicitudProductoRepository;
    private final MembresiaRepository membresiaRepository;
    private final SocioService socioService;
    private final SocioRepository socioRepository;
    private final SuscripcionService suscripcionService;
    private final EmailService emailService;
    @GetMapping
    public ResponseEntity<List<SolicitudMembresia>> listarTodas() {
        return ResponseEntity.ok(solicitudMembresiaRepository.findAll());
    }
    @GetMapping("/pendientes")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudMembresia>> listarPendientes() {
        return ResponseEntity.ok(solicitudMembresiaRepository.findByEstado(EstadoSolicitud.PENDIENTE));
    }

    @GetMapping("/por-estado/{estado}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudMembresia>> listarPorEstado(@PathVariable EstadoSolicitud estado) {
        return ResponseEntity.ok(solicitudMembresiaRepository.findByEstado(estado));
    }
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody SolicitudMembresiaRequest request) {
        if (solicitudMembresiaRepository.existsByNumeroOperacion(request.getNumeroOperacion()) ||
            solicitudProductoRepository.existsByNumeroOperacion(request.getNumeroOperacion())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("mensaje", "El número de operación ingresado ya ha sido registrado."));
        }

        Membresia membresia = membresiaRepository.findById(request.getMembresiaId())
                .orElseThrow(() -> new ResourceNotFoundException("Membresía", request.getMembresiaId()));
        SolicitudMembresia solicitud = SolicitudMembresia.builder()
                .dni(request.getDni())
                .nombreCompleto(request.getNombreCompleto())
                .telefono(request.getTelefono())
                .email(request.getEmail())
                .numeroOperacion(request.getNumeroOperacion())
                .membresia(membresia)
                .comprobanteUrl(request.getComprobanteUrl())
                .estado(EstadoSolicitud.PENDIENTE)
                .build();
        SolicitudMembresia guardada = solicitudMembresiaRepository.save(solicitud);
        log.info("Nueva solicitud de membresía creada para DNI: {}", request.getDni());
        return new ResponseEntity<>(guardada, HttpStatus.CREATED);
    }
    @PostMapping("/{id}/aprobar")
    public ResponseEntity<SolicitudMembresia> aprobar(@PathVariable Long id) {
        SolicitudMembresia solicitud = solicitudMembresiaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudMembresia", id));
        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya no se encuentra PENDIENTE.");
        }
        // Buscar o registrar socio
        Optional<Socio> socioOpt = socioRepository.findByDni(solicitud.getDni());
        Socio socio;
        if (socioOpt.isPresent()) {
            socio = socioOpt.get();
            log.info("Socio existente encontrado (DNI: {}), asociando suscripción.", socio.getDni());
        } else {
            socio = Socio.builder()
                    .dni(solicitud.getDni())
                    .nombreCompleto(solicitud.getNombreCompleto())
                    .telefono(solicitud.getTelefono())
                    .email(solicitud.getEmail())
                    .estado(Socio.EstadoSocio.ACTIVO)
                    .build();
            socio = socioService.registrar(socio);
            log.info("Nuevo socio registrado a través de solicitud (DNI: {})", socio.getDni());
        }
        // Crear la suscripción sin enviar correo (lo enviamos aquí con más detalle)
        Suscripcion nuevaSuscripcion = suscripcionService.crear(
                socio.getId(),
                solicitud.getMembresia().getId(),
                LocalDate.now(),
                Suscripcion.EstadoPago.PAGADO,
                true,
                false,
                null,
                socio.getNombreCompleto(),
                socio.getDni(),
                "TRANSFERENCIA",
                false  // no enviar correo genérico; lo enviamos abajo con detalle
        );
        solicitud.setEstado(EstadoSolicitud.APROBADA);
        SolicitudMembresia guardada = solicitudMembresiaRepository.save(solicitud);
        // Enviar correo con detalle de lo comprado y número de operación
        try {
            emailService.enviarConfirmacionCompra(nuevaSuscripcion, solicitud.getNumeroOperacion());
        } catch (Exception e) {
            log.warn("No se pudo enviar correo de confirmación de membresía: {}", e.getMessage());
        }
        log.info("Solicitud ID {} aprobada con éxito.", id);
        return ResponseEntity.ok(guardada);
    }
    @PostMapping("/{id}/rechazar")
    public ResponseEntity<SolicitudMembresia> rechazar(@PathVariable Long id) {
        SolicitudMembresia solicitud = solicitudMembresiaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudMembresia", id));
        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya no se encuentra PENDIENTE.");
        }
        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        SolicitudMembresia guardada = solicitudMembresiaRepository.save(solicitud);
        log.info("Solicitud ID {} rechazada.", id);
        return ResponseEntity.ok(guardada);
    }
}