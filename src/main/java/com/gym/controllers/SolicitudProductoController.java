package com.gym.controllers;

import com.gym.dtos.SolicitudProductoRequest;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.DetalleSolicitudProducto;
import com.gym.models.Producto;
import com.gym.models.SolicitudProducto;
import com.gym.models.SolicitudProducto.EstadoSolicitud;
import com.gym.models.Venta;
import com.gym.repositories.ProductoRepository;
import com.gym.repositories.SolicitudMembresiaRepository;
import com.gym.repositories.SolicitudProductoRepository;
import com.gym.services.EmailService;
import com.gym.services.VentaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/solicitudes-producto")
@RequiredArgsConstructor
@Slf4j
public class SolicitudProductoController {
    private final SolicitudProductoRepository solicitudProductoRepository;
    private final SolicitudMembresiaRepository solicitudMembresiaRepository;
    private final ProductoRepository productoRepository;
    private final VentaService ventaService;
    private final EmailService emailService;

    @GetMapping
    @PreAuthorize("hasAuthority('solicitudes:ver')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarTodas() {
        return ResponseEntity.ok(solicitudProductoRepository.findAllWithDetalles());
    }

    @GetMapping("/pendientes")
    @PreAuthorize("hasAuthority('solicitudes:ver')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarPendientes() {
        return ResponseEntity.ok(solicitudProductoRepository.findByEstadoWithDetalles(EstadoSolicitud.PENDIENTE));
    }

    @GetMapping("/por-estado/{estado}")
    @PreAuthorize("hasAuthority('solicitudes:ver')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarPorEstado(@PathVariable EstadoSolicitud estado) {
        return ResponseEntity.ok(solicitudProductoRepository.findByEstadoWithDetalles(estado));
    }

    @GetMapping("/venta/{ventaId}")
    @PreAuthorize("hasAuthority('solicitudes:ver')")
    public ResponseEntity<SolicitudProducto> obtenerPorVentaId(@PathVariable Long ventaId) {
        return solicitudProductoRepository.findAll().stream()
                .filter(s -> s.getVenta() != null && s.getVenta().getId().equals(ventaId))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    // Endpoint público del catálogo virtual — protegido por rate limiting en application.properties
    // (rate.limit.max.requests=5 por IP/minuto) implementado en RateLimiterService
    public ResponseEntity<?> crear(@RequestBody SolicitudProductoRequest request) {
        if (solicitudProductoRepository.existsByNumeroOperacion(request.getNumeroOperacion()) ||
            solicitudMembresiaRepository.existsByNumeroOperacion(request.getNumeroOperacion())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("mensaje", "El número de operación ingresado ya ha sido registrado."));
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("La solicitud debe incluir al menos un producto.");
        }

        // 1. Validar disponibilidad de stock para TODOS los productos antes de realizar cualquier cambio
        for (var item : request.getItems()) {
            Producto producto = productoRepository.findById(item.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + item.getProductoId()));
            if (producto.getStock() < item.getCantidad()) {
                return ResponseEntity.badRequest().body(java.util.Map.of(
                        "mensaje", "Stock insuficiente para el producto: " + producto.getNombre() + " (Disponible: " + producto.getStock() + ")"
                ));
            }
        }

        // 2. Descontar/Reservar el stock y armar los detalles
        List<DetalleSolicitudProducto> detalles = request.getItems().stream()
                .map(item -> {
                    Producto producto = productoRepository.findById(item.getProductoId()).orElseThrow();
                    
                    // Reservar stock inmediatamente
                    producto.setStock(producto.getStock() - item.getCantidad());
                    productoRepository.save(producto);

                    return DetalleSolicitudProducto.builder()
                            .producto(producto)
                            .cantidad(item.getCantidad())
                            .precioUnitario(item.getPrecioUnitario())
                            .build();
                })
                .collect(Collectors.toList());

        SolicitudProducto solicitud = SolicitudProducto.builder()
                .dni(request.getDni())
                .nombreCompleto(request.getNombreCompleto())
                .telefono(request.getTelefono())
                .email(request.getEmail())
                .numeroOperacion(request.getNumeroOperacion())
                .total(request.getTotal())
                .comprobanteUrl(request.getComprobanteUrl())
                .estado(EstadoSolicitud.PENDIENTE)
                .items(detalles)
                .build();

        detalles.forEach(detalle -> detalle.setSolicitudProducto(solicitud));

        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Nueva solicitud de producto creada con stock reservado para DNI: {}", request.getDni());
        return new ResponseEntity<>(guardada, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/aprobar")
    @PreAuthorize("hasAuthority('solicitudes:aprobar')")
    @Transactional
    public ResponseEntity<SolicitudProducto> aprobar(@PathVariable Long id) {
        SolicitudProducto solicitud = solicitudProductoRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudProducto", id));

        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya no se encuentra PENDIENTE.");
        }

        if (solicitud.getItems() == null || solicitud.getItems().isEmpty()) {
            throw new IllegalStateException("La solicitud no tiene productos asociados.");
        }

        // Venta del punto de venta: el stock ya se descontó al registrar la venta.
        if (solicitud.getVenta() != null) {
            solicitud.setEstado(EstadoSolicitud.APROBADA);
            SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
            log.info("Solicitud de producto ID {} aprobada (venta POS existente ID {}).",
                    id, solicitud.getVenta().getId());
            try {
                emailService.enviarConfirmacionVenta(guardada);
            } catch (Exception e) {
                log.error("Error al enviar correo de confirmación de venta: {}", e.getMessage());
            }
            return ResponseEntity.ok(guardada);
        }

        // El stock ya fue reservado (restado) en la creación de la solicitud, por lo que no es necesario
        // volver a restarlo ni validarlo aquí.
        Venta venta = ventaService.registrarVentaDesdeSolicitudCatalogo(solicitud);
        solicitud.setVenta(venta);
        solicitud.setEstado(EstadoSolicitud.APROBADA);
        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Solicitud de producto ID {} aprobada. Venta registrada ID {}.", id, venta.getId());
        try {
            emailService.enviarConfirmacionVenta(guardada);
        } catch (Exception e) {
            log.error("Error al enviar correo de confirmación de venta: {}", e.getMessage());
        }
        return ResponseEntity.ok(guardada);
    }

    @PostMapping("/{id}/rechazar")
    @PreAuthorize("hasAuthority('solicitudes:aprobar')")
    @Transactional
    public ResponseEntity<SolicitudProducto> rechazar(@PathVariable Long id) {
        SolicitudProducto solicitud = solicitudProductoRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudProducto", id));

        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya no se encuentra PENDIENTE.");
        }

        // Reponer stock reservado
        if (solicitud.getItems() != null) {
            solicitud.getItems().forEach(detalle -> {
                Producto producto = detalle.getProducto();
                producto.setStock(producto.getStock() + detalle.getCantidad());
                productoRepository.save(producto);
                log.info("Stock liberado/repuesto para producto: {} (+{})", producto.getNombre(), detalle.getCantidad());
            });
        }

        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Solicitud de producto ID {} rechazada.", id);
        return ResponseEntity.ok(guardada);
    }

    @PostMapping("/{id}/entregar")
    @PreAuthorize("hasAuthority('solicitudes:aprobar')")
    @Transactional
    public ResponseEntity<SolicitudProducto> entregar(@PathVariable Long id) {
        SolicitudProducto solicitud = solicitudProductoRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudProducto", id));

        if (solicitud.getEstado() != EstadoSolicitud.APROBADA) {
            throw new IllegalStateException("La solicitud debe estar APROBADA para poder ser entregada.");
        }

        solicitud.setEstado(EstadoSolicitud.ENTREGADO);
        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Solicitud de producto ID {} marcada como ENTREGADO.", id);
        return ResponseEntity.ok(guardada);
    }
}
