package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.*;
import com.gym.models.Venta.TipoComprobante;
import com.gym.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio de Ventas v2.0.
 * Features: pagos mixtos (Feature 4), anulación con PIN admin (Feature 2),
 * vinculación a sesión de caja activa (Feature 1).
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
    private final SesionCajaService sesionCajaService;
    private final LogAnulacionRepository logAnulacionRepository;
    private final PagoRepository pagoRepository;
    private final SuscripcionRepository suscripcionRepository;

    // ─────────────────────────────────────────────
    //  REGISTRAR VENTA CON PAGOS MIXTOS (Feature 4)
    // ─────────────────────────────────────────────

    /**
     * Registra una venta con soporte de pagos mixtos.
     *
     * @param socioId           ID del socio (null para público general)
     * @param pagos             Lista de métodos y montos de pago (puede ser 1 o más)
     * @param detalles          Productos vendidos
     * @param tipoComprobante   Tipo de comprobante
     * @param clienteNombre     Nombre libre del cliente
     * @param clienteDocumento  Documento del cliente
     */
    public Venta registrarVenta(Long socioId, List<PagoVenta> pagos,
                                List<DetalleVenta> detalles, TipoComprobante tipoComprobante,
                                String clienteNombre, String clienteDocumento) {
        return registrarVenta(socioId, pagos, detalles, tipoComprobante,
                              clienteNombre, clienteDocumento, false, true);
    }

    public Venta registrarVenta(Long socioId, List<PagoVenta> pagos,
                                List<DetalleVenta> detalles, TipoComprobante tipoComprobante,
                                String clienteNombre, String clienteDocumento,
                                boolean crearSolicitudAutomatica) {
        return registrarVenta(socioId, pagos, detalles, tipoComprobante,
                              clienteNombre, clienteDocumento, crearSolicitudAutomatica, true);
    }

    public Venta registrarVenta(Long socioId, List<PagoVenta> pagos,
                                List<DetalleVenta> detalles, TipoComprobante tipoComprobante,
                                String clienteNombre, String clienteDocumento,
                                boolean crearSolicitudAutomatica, boolean descontarStock) {

        // Verificar sesión activa (Feature 1)
        SesionCaja sesion = sesionCajaService.obtenerSesionActivaOFallar();

        Socio socio = null;
        if (socioId != null) {
            socio = socioRepository.findById(socioId)
                    .orElseThrow(() -> new ResourceNotFoundException("Socio", socioId));
        }

        // Calcular total y total_efectivo desde los pagos
        BigDecimal totalPagado = pagos.stream()
                .map(PagoVenta::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalEfectivo = pagos.stream()
                .filter(p -> p.getMetodoPago() == Venta.MetodoPago.EFECTIVO)
                .map(PagoVenta::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Método de pago legado: el primero de la lista
        Venta.MetodoPago metodoPagoLegado = pagos.isEmpty() ? Venta.MetodoPago.EFECTIVO
                : pagos.get(0).getMetodoPago();

        Venta venta = Venta.builder()
                .sesion(sesion)
                .socio(socio)
                .clienteNombre(clienteNombre)
                .clienteDocumento(clienteDocumento)
                .fecha(LocalDateTime.now())
                .metodoPago(metodoPagoLegado)
                .tipoComprobante(tipoComprobante != null ? tipoComprobante : TipoComprobante.NOTA_VENTA)
                .total(BigDecimal.ZERO)    // se calculará abajo
                .totalEfectivo(totalEfectivo)
                .build();

        BigDecimal subtotalGeneral = BigDecimal.ZERO;
        for (DetalleVenta item : detalles) {
            Producto p = productoService.buscarPorId(item.getProducto().getId());
            if (!p.getNombre().startsWith("Servicio de Membresía")) {
                if (p.getStock() < item.getCantidad()) {
                    throw new IllegalStateException("Stock insuficiente para: " + p.getNombre()
                            + " (Pedido: " + item.getCantidad() + ", Disponible: " + p.getStock() + ")");
                }
            }
            item.setProducto(p);
            if (item.getPrecioUnitario() == null) item.setPrecioUnitario(p.getPrecio());
            BigDecimal subtotalItem = item.getPrecioUnitario().multiply(BigDecimal.valueOf(item.getCantidad()));
            item.setSubtotal(subtotalItem);
            subtotalGeneral = subtotalGeneral.add(subtotalItem);
            venta.addDetalle(item);
        }

        // Validar que la suma de pagos == total de la venta
        if (totalPagado.compareTo(subtotalGeneral) != 0) {
            throw new IllegalStateException(
                String.format("La suma de los pagos (S/%.2f) no coincide con el total de la venta (S/%.2f).",
                    totalPagado, subtotalGeneral));
        }

        venta.setTotal(subtotalGeneral);
        // Recalcular totalEfectivo proporcional si fuera necesario
        // (ya calculado arriba desde los pagos enviados por el cliente)

        if (descontarStock) {
            descontarStockDeDetalles(venta.getDetalles());
        }

        try {
            facturacionService.procesarComprobante(venta);
        } catch (Exception apiEx) {
            log.error("Fallo al procesar comprobante electrónico: {}", apiEx.getMessage());
            venta.setEstadoSunat("ERROR_API");
        }

        Venta guardada = ventaRepository.save(venta);

        // Guardar los pagos mixtos vinculados a la venta
        for (PagoVenta pv : pagos) {
            pv.setVenta(guardada);
        }
        guardada.getPagosVenta().addAll(pagos);
        guardada = ventaRepository.save(guardada);

        if (crearSolicitudAutomatica) {
            crearSolicitudProductoDesdeVenta(guardada);
        }

        log.info("Venta ID:{} | Sesión:{} | Total:S/{} | Efectivo:S/{} | Comprobante:{}-{}",
                guardada.getId(), sesion.getId(), guardada.getTotal(),
                guardada.getTotalEfectivo(), guardada.getSerie(), guardada.getCorrelativo());

        return guardada;
    }

    // ─────────────────────────────────────────────
    //  ANULAR COMPROBANTE CON PIN (Feature 2)
    // ─────────────────────────────────────────────

    /**
     * Anula un comprobante. Requiere PIN de administrador.
     * NUNCA se llama "eliminar". El registro persiste en BD.
     */
    public Venta anularComprobante(Long ventaId, String motivoAnulacion, String pinAdmin) {
        // 1. Validar PIN de admin PRIMERO
        sesionCajaService.validarPinAdmin(pinAdmin);

        // 2. Cargar la venta
        Venta venta = ventaRepository.findByIdWithDetalles(ventaId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", ventaId));

        // 3. Verificar que no esté ya anulada
        if (!venta.isActivo()) {
            throw new IllegalStateException("El comprobante ya fue anulado anteriormente.");
        }

        // 4. Obtener la sesión activa (debe haber una para registrar la devolución)
        SesionCaja sesionActiva = sesionCajaService.obtenerSesionActivaOFallar();

        // 5. Revertir stock
        reponerStockDeDetalles(venta.getDetalles());

        // 6. Marcar la venta como anulada (nunca se borra)
        venta.setActivo(false);
        venta.setMotivoAnulacion(motivoAnulacion);
        venta.setAnuladoPor(obtenerUsernameAdmin(pinAdmin));
        venta.setAnuladoAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Desactivar automáticamente cualquier suscripción asociada a esta venta
        List<Pago> pagosAsociados = pagoRepository.findByVentaId(ventaId);
        for (Pago pago : pagosAsociados) {
            Suscripcion sus = pago.getSuscripcion();
            if (sus != null) {
                sus.setActivo(false); // Soft Delete
                suscripcionRepository.save(sus);
                log.info("Suscripción ID {} desactivada automáticamente debido a la anulación de la venta ID {}", sus.getId(), ventaId);
            }
        }

        // 7. Registrar en el log de auditoría inmutable
        LogAnulacion log = LogAnulacion.builder()
                .venta(venta)
                .sesion(sesionActiva)
                .motivo(motivoAnulacion)
                .anuladoPor(venta.getAnuladoPor())
                .montoDevueltoEfectivo(venta.getTotalEfectivo())
                .build();
        logAnulacionRepository.save(log);

        log("Comprobante {} anulado por {}. Efectivo devuelto a caja: S/{}",
                ventaId, venta.getAnuladoPor(), venta.getTotalEfectivo());
        return venta;
    }

    /**
     * Anula o restaura venta (método legado mantenido para compatibilidad).
     */
    public Venta cambiarEstadoVenta(Long id, boolean activo, String motivo) {
        Venta venta = ventaRepository.findByIdWithDetalles(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", id));
        if (venta.isActivo() == activo) return venta;

        if (!activo) {
            reponerStockDeDetalles(venta.getDetalles());
            venta.setActivo(false);
            venta.setMotivoAnulacion(motivo);
        } else {
            for (DetalleVenta item : venta.getDetalles()) {
                Producto p = item.getProducto();
                if (afectaInventario(p) && p.getStock() < item.getCantidad()) {
                    throw new IllegalStateException("Stock insuficiente para reactivar. Producto: " + p.getNombre());
                }
            }
            descontarStockDeDetalles(venta.getDetalles());
            venta.setActivo(true);
            venta.setMotivoAnulacion(null);
        }
        return ventaRepository.save(venta);
    }

    // ─────────────────────────────────────────────
    //  QUERIES DE CONSULTA
    // ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Venta> listarTodas() {
        return ventaRepository.findAll();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Venta> listarTodas(org.springframework.data.domain.Pageable pageable) {
        return ventaRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public List<Venta> listarVentasProductos() {
        return ventaRepository.findVentasDeProductos();
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Venta> listarVentasProductos(org.springframework.data.domain.Pageable pageable) {
        return ventaRepository.findVentasDeProductos(pageable);
    }

    @Transactional(readOnly = true)
    public Venta buscarPorId(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", id));
    }

    /** Registra la venta al aprobar una solicitud del catálogo virtual. */
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

        Long socioId = socioRepository.findByDni(solicitud.getDni()).map(Socio::getId).orElse(null);

        // Catálogo virtual siempre es Yape/Plin (pago único)
        PagoVenta pagoUnico = PagoVenta.builder()
                .metodoPago(Venta.MetodoPago.YAPE_PLIN)
                .monto(solicitud.getTotal())
                .build();

        return registrarVenta(socioId, List.of(pagoUnico), detalles,
                TipoComprobante.NOTA_VENTA, solicitud.getNombreCompleto(), solicitud.getDni(), false, false);
    }

    public Venta emitirComprobante(Long id, Venta.TipoComprobante nuevoTipo, String documento, String nombre) {
        Venta venta = buscarPorId(id);
        if (!venta.isActivo()) throw new IllegalStateException("No se puede emitir comprobante sobre una venta anulada.");
        if (venta.getTipoComprobante() != TipoComprobante.NOTA_VENTA) {
            throw new IllegalStateException("Esta venta ya es un comprobante fiscal (" + venta.getTipoComprobante() + ").");
        }
        venta.setTipoComprobante(nuevoTipo);
        if (documento != null && !documento.isBlank()) venta.setClienteDocumento(documento);
        if (nombre != null && !nombre.isBlank()) venta.setClienteNombre(nombre);
        try { facturacionService.procesarComprobante(venta); }
        catch (Exception e) { log.error("Fallo SUNAT: {}", e.getMessage()); venta.setEstadoSunat("ERROR_API"); }
        return ventaRepository.save(venta);
    }

    // ─────────────────────────────────────────────
    //  HELPERS PRIVADOS
    // ─────────────────────────────────────────────

    private String obtenerUsernameAdmin(String pinAdmin) {
        // Reutiliza la búsqueda del servicio; aquí se extrae el username
        return "admin"; // simplificado — el PinAdmin fue validado antes
    }

    private void crearSolicitudProductoDesdeVenta(Venta venta) {
        boolean esMembresia = venta.getDetalles().stream()
                .anyMatch(d -> d.getProducto() != null && "Servicio de Membresía".equals(d.getProducto().getNombre()));
        if (esMembresia) return;

        String dni = venta.getClienteDocumento() != null && !venta.getClienteDocumento().isBlank()
                ? venta.getClienteDocumento() : "00000000";
        String nombre = venta.getClienteNombre() != null && !venta.getClienteNombre().isBlank()
                ? venta.getClienteNombre() : "Cliente General";
        if (venta.getSocio() != null) { dni = venta.getSocio().getDni(); nombre = venta.getSocio().getNombreCompleto(); }

        List<DetalleSolicitudProducto> detallesSolicitud = venta.getDetalles().stream()
                .map(d -> DetalleSolicitudProducto.builder()
                        .producto(d.getProducto()).cantidad(d.getCantidad()).precioUnitario(d.getPrecioUnitario())
                        .build())
                .collect(Collectors.toList());

        SolicitudProducto solicitud = SolicitudProducto.builder()
                .dni(dni).nombreCompleto(nombre)
                .telefono(venta.getSocio() != null ? venta.getSocio().getTelefono() : "")
                .email(venta.getSocio() != null ? venta.getSocio().getEmail() : "")
                .numeroOperacion(venta.getSerie() + "-" + venta.getCorrelativo())
                .total(venta.getTotal())
                .comprobanteUrl(venta.getEnlacePdfTicket() != null ? venta.getEnlacePdfTicket() : venta.getEnlacePdfA4())
                .estado(SolicitudProducto.EstadoSolicitud.PENDIENTE)
                .venta(venta).items(detallesSolicitud).build();
        detallesSolicitud.forEach(d -> d.setSolicitudProducto(solicitud));
        solicitudProductoRepository.save(solicitud);
    }

    private boolean afectaInventario(Producto p) {
        return p != null && p.getNombre() != null && !p.getNombre().startsWith("Servicio de Membresía");
    }

    private void descontarStockDeDetalles(List<DetalleVenta> detalles) {
        detalles.stream().filter(i -> afectaInventario(i.getProducto()))
                .forEach(i -> productoService.descontarStock(i.getProducto().getId(), i.getCantidad()));
    }

    private void reponerStockDeDetalles(List<DetalleVenta> detalles) {
        detalles.stream().filter(i -> afectaInventario(i.getProducto()))
                .forEach(i -> productoService.reponerStock(i.getProducto().getId(), i.getCantidad()));
    }

    private void log(String msg, Object... args) {
        log.info(msg, args);
    }
}
