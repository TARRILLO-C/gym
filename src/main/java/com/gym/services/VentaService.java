package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.*;
import com.gym.models.Venta.MetodoPago;
import com.gym.models.Venta.TipoComprobante;
import com.gym.repositories.SocioRepository;
import com.gym.repositories.SolicitudProductoRepository;
import com.gym.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio encargado de la gestión de Ventas de productos.
 * Incluye la validación de stock y actualización automática del inventario.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class VentaService {

    private final VentaRepository ventaRepository;
    private final ProductoService productoService;
    private final SocioRepository socioRepository;
    private final FacturacionService facturacionService;
    private final SolicitudProductoRepository solicitudProductoRepository;

    /**
     * Registra una nueva venta de productos.
     */
    public Venta registrarVenta(Long socioId, MetodoPago metodoPago, List<DetalleVenta> detalles,
                               TipoComprobante tipoComprobante, String clienteNombre, String clienteDocumento) {
        return registrarVenta(socioId, metodoPago, detalles, tipoComprobante, clienteNombre, clienteDocumento, true);
    }

    public Venta registrarVenta(Long socioId, MetodoPago metodoPago, List<DetalleVenta> detalles,
                               TipoComprobante tipoComprobante, String clienteNombre, String clienteDocumento,
                               boolean crearSolicitudAutomatica) {
        Socio socio = null;
        if (socioId != null) {
            socio = socioRepository.findById(socioId)
                    .orElseThrow(() -> new ResourceNotFoundException("Socio", socioId));
        }

        Venta venta = Venta.builder()
                .socio(socio)
                .clienteNombre(clienteNombre)
                .clienteDocumento(clienteDocumento)
                .fecha(LocalDateTime.now())
                .metodoPago(metodoPago)
                .tipoComprobante(tipoComprobante != null ? tipoComprobante : Venta.TipoComprobante.NOTA_VENTA)
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal subtotalGeneral = BigDecimal.ZERO;

        for (DetalleVenta item : detalles) {
            Producto p = productoService.buscarPorId(item.getProducto().getId());

            if (!p.getNombre().startsWith("Servicio de Membresía")) {
                if (p.getStock() < item.getCantidad()) {
                    throw new IllegalStateException("Stock insuficiente para: " + p.getNombre() +
                            " (Pedido: " + item.getCantidad() + ", Disponible: " + p.getStock() + ")");
                }
            }

            item.setProducto(p);
            if (item.getPrecioUnitario() == null) {
                item.setPrecioUnitario(p.getPrecio());
            }
            BigDecimal subtotalItem = item.getPrecioUnitario().multiply(BigDecimal.valueOf(item.getCantidad()));
            item.setSubtotal(subtotalItem);

            subtotalGeneral = subtotalGeneral.add(subtotalItem);
            venta.addDetalle(item);
        }

        venta.setTotal(subtotalGeneral);
        descontarStockDeDetalles(venta.getDetalles());

        try {
            facturacionService.procesarComprobante(venta);
        } catch (Exception apiEx) {
            log.error("Fallo al procesar comprobante electrónico (venta se guarda igualmente): {}", apiEx.getMessage());
            venta.setEstadoSunat("ERROR_API");
        }

        Venta guardada = ventaRepository.save(venta);
        if (crearSolicitudAutomatica) {
            crearSolicitudProductoDesdeVenta(guardada);
        }

        log.info("Venta registrada ID: {} - {} {}-{} - Total: S/ {}",
                guardada.getId(), guardada.getTipoComprobante(),
                guardada.getSerie(), guardada.getCorrelativo(),
                guardada.getTotal());

        return guardada;
    }

    @Transactional(readOnly = true)
    public List<Venta> listarTodas() {
        return ventaRepository.findAll();
    }

    /**
     * Historial de ventas de productos (excluye ventas vinculadas a pagos de suscripción).
     */
    @Transactional(readOnly = true)
    public List<Venta> listarVentasProductos() {
        return ventaRepository.findVentasDeProductos();
    }

    /**
     * Registra la venta al aprobar una solicitud del catálogo virtual.
     */
    public Venta registrarVentaDesdeSolicitudCatalogo(SolicitudProducto solicitud) {
        if (solicitud.getItems() == null || solicitud.getItems().isEmpty()) {
            throw new IllegalStateException("La solicitud no tiene productos asociados.");
        }

        List<DetalleVenta> detalles = solicitud.getItems().stream()
                .map(item -> DetalleVenta.builder()
                        .producto(item.getProducto())
                        .cantidad(item.getCantidad())
                        .precioUnitario(item.getPrecioUnitario())
                        .build())
                .collect(Collectors.toList());

        Long socioId = socioRepository.findByDni(solicitud.getDni())
                .map(Socio::getId)
                .orElse(null);

        return registrarVenta(
                socioId,
                MetodoPago.YAPE_PLIN,
                detalles,
                TipoComprobante.NOTA_VENTA,
                solicitud.getNombreCompleto(),
                solicitud.getDni(),
                false
        );
    }

    @Transactional(readOnly = true)
    public Venta buscarPorId(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", id));
    }

    /**
     * Anula o restaura una venta, reponiendo o descontando stock según corresponda.
     */
    public Venta cambiarEstadoVenta(Long id, boolean activo, String motivo) {
        Venta venta = ventaRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", id));
        if (venta.isActivo() == activo) {
            return venta;
        }

        if (!activo) {
            reponerStockDeDetalles(venta.getDetalles());
            venta.setActivo(false);
            venta.setMotivoAnulacion(motivo);
            log.info("Venta ID {} anulada. Motivo: {}", id, motivo);
        } else {
            for (DetalleVenta item : venta.getDetalles()) {
                Producto p = item.getProducto();
                if (afectaInventario(p) && p.getStock() < item.getCantidad()) {
                    throw new IllegalStateException("Stock insuficiente para reactivar la venta. Producto: "
                            + p.getNombre());
                }
            }
            descontarStockDeDetalles(venta.getDetalles());
            venta.setActivo(true);
            venta.setMotivoAnulacion(null);
            log.info("Venta ID {} restaurada.", id);
        }

        return ventaRepository.save(venta);
    }

    /**
     * Convierte una Nota de Venta interna en una Factura o Boleta con valor legal hacia SUNAT.
     */
    public Venta emitirComprobante(Long id, Venta.TipoComprobante nuevoTipo, String documento, String nombre) {
        Venta venta = buscarPorId(id);

        if (!venta.isActivo()) {
            throw new IllegalStateException("No se puede emitir un comprobante sobre una venta anulada.");
        }

        if (venta.getTipoComprobante() != Venta.TipoComprobante.NOTA_VENTA) {
            throw new IllegalStateException("Esta venta ya es un comprobante fiscal (" + venta.getTipoComprobante() + ").");
        }

        venta.setTipoComprobante(nuevoTipo);
        if (documento != null && !documento.isBlank()) {
            venta.setClienteDocumento(documento);
        }
        if (nombre != null && !nombre.isBlank()) {
            venta.setClienteNombre(nombre);
        }

        try {
            facturacionService.procesarComprobante(venta);
        } catch (Exception apiEx) {
            log.error("Fallo al emitir comprobante SUNAT (venta se guarda igualmente): {}", apiEx.getMessage());
            venta.setEstadoSunat("ERROR_API");
        }

        log.info("Nota de Venta ID {} promovida a {} {}", id, nuevoTipo, venta.getSerie() + "-" + venta.getCorrelativo());
        return ventaRepository.save(venta);
    }

    /**
     * Crea automáticamente una SolicitudProducto a partir de una Venta.
     */
    private void crearSolicitudProductoDesdeVenta(Venta venta) {
        boolean esMembresia = venta.getDetalles().stream()
                .anyMatch(detalleVenta -> detalleVenta.getProducto() != null 
                        && "Servicio de Membresía".equals(detalleVenta.getProducto().getNombre()));
        if (esMembresia) {
            log.info("Venta ID {} es una membresía, no se crea SolicitudProducto.", venta.getId());
            return;
        }

        String dni = venta.getClienteDocumento() != null && !venta.getClienteDocumento().isBlank()
                ? venta.getClienteDocumento()
                : "00000000";
        String nombre = venta.getClienteNombre() != null && !venta.getClienteNombre().isBlank()
                ? venta.getClienteNombre()
                : "Cliente General";

        if (venta.getSocio() != null) {
            dni = venta.getSocio().getDni();
            nombre = venta.getSocio().getNombreCompleto();
        }

        List<DetalleSolicitudProducto> detallesSolicitud = venta.getDetalles().stream()
                .map(detalleVenta -> DetalleSolicitudProducto.builder()
                        .producto(detalleVenta.getProducto())
                        .cantidad(detalleVenta.getCantidad())
                        .precioUnitario(detalleVenta.getPrecioUnitario())
                        .build())
                .collect(Collectors.toList());

        String comprobanteUrl = venta.getEnlacePdfTicket() != null ? venta.getEnlacePdfTicket()
                : venta.getEnlacePdfA4() != null ? venta.getEnlacePdfA4() : null;

        SolicitudProducto solicitud = SolicitudProducto.builder()
                .dni(dni)
                .nombreCompleto(nombre)
                .telefono(venta.getSocio() != null ? venta.getSocio().getTelefono() : "")
                .email(venta.getSocio() != null ? venta.getSocio().getEmail() : "")
                .numeroOperacion(venta.getSerie() + "-" + venta.getCorrelativo())
                .total(venta.getTotal())
                .comprobanteUrl(comprobanteUrl)
                .estado(SolicitudProducto.EstadoSolicitud.PENDIENTE)
                .venta(venta)
                .items(detallesSolicitud)
                .build();

        detallesSolicitud.forEach(detalle -> detalle.setSolicitudProducto(solicitud));

        solicitudProductoRepository.save(solicitud);
        log.info("SolicitudProducto creada automáticamente para Venta ID: {}", venta.getId());
    }

    private boolean afectaInventario(Producto producto) {
        return producto != null
                && producto.getNombre() != null
                && !producto.getNombre().startsWith("Servicio de Membresía");
    }

    private void descontarStockDeDetalles(List<DetalleVenta> detalles) {
        for (DetalleVenta item : detalles) {
            if (afectaInventario(item.getProducto())) {
                productoService.descontarStock(item.getProducto().getId(), item.getCantidad());
            }
        }
    }

    private void reponerStockDeDetalles(List<DetalleVenta> detalles) {
        for (DetalleVenta item : detalles) {
            if (afectaInventario(item.getProducto())) {
                productoService.reponerStock(item.getProducto().getId(), item.getCantidad());
            }
        }
    }
}
