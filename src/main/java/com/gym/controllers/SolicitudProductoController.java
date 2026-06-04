package com.gym.controllers;

import com.gym.dtos.SolicitudProductoRequest;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.DetalleSolicitudProducto;
import com.gym.models.Producto;
import com.gym.models.SolicitudProducto;
import com.gym.models.SolicitudProducto.EstadoSolicitud;
import com.gym.models.Venta;
import com.gym.repositories.ProductoRepository;
import com.gym.repositories.SolicitudProductoRepository;
import com.gym.services.VentaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    private final ProductoRepository productoRepository;
    private final VentaService ventaService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarTodas() {
        return ResponseEntity.ok(solicitudProductoRepository.findAllWithDetalles());
    }

    @GetMapping("/pendientes")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarPendientes() {
        return ResponseEntity.ok(solicitudProductoRepository.findByEstadoWithDetalles(EstadoSolicitud.PENDIENTE));
    }

    @GetMapping("/por-estado/{estado}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SolicitudProducto>> listarPorEstado(@PathVariable EstadoSolicitud estado) {
        return ResponseEntity.ok(solicitudProductoRepository.findByEstadoWithDetalles(estado));
    }

    @GetMapping("/venta/{ventaId}")
    public ResponseEntity<SolicitudProducto> obtenerPorVentaId(@PathVariable Long ventaId) {
        return solicitudProductoRepository.findAll().stream()
                .filter(s -> s.getVenta() != null && s.getVenta().getId().equals(ventaId))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<SolicitudProducto> crear(@RequestBody SolicitudProductoRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("La solicitud debe incluir al menos un producto.");
        }
        List<DetalleSolicitudProducto> detalles = request.getItems().stream()
                .map(item -> {
                    Producto producto = productoRepository.findById(item.getProductoId())
                            .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + item.getProductoId()));
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
        log.info("Nueva solicitud de producto creada para DNI: {}", request.getDni());
        return new ResponseEntity<>(guardada, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/aprobar")
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
            return ResponseEntity.ok(guardada);
        }

        solicitud.getItems().forEach(detalle -> {
            Producto producto = detalle.getProducto();
            if (producto.getStock() < detalle.getCantidad()) {
                throw new IllegalStateException("Stock insuficiente para producto: " + producto.getNombre());
            }
        });

        Venta venta = ventaService.registrarVentaDesdeSolicitudCatalogo(solicitud);
        solicitud.setVenta(venta);
        solicitud.setEstado(EstadoSolicitud.APROBADA);
        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Solicitud de producto ID {} aprobada. Venta registrada ID {}.", id, venta.getId());
        return ResponseEntity.ok(guardada);
    }

    @PostMapping("/{id}/rechazar")
    @Transactional
    public ResponseEntity<SolicitudProducto> rechazar(@PathVariable Long id) {
        SolicitudProducto solicitud = solicitudProductoRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("SolicitudProducto", id));

        if (solicitud.getEstado() != EstadoSolicitud.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya no se encuentra PENDIENTE.");
        }

        solicitud.setEstado(EstadoSolicitud.RECHAZADA);
        SolicitudProducto guardada = solicitudProductoRepository.save(solicitud);
        log.info("Solicitud de producto ID {} rechazada.", id);
        return ResponseEntity.ok(guardada);
    }
}
