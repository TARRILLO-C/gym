package com.gym.services;

import com.gym.models.Pago;
import com.gym.models.Suscripcion;
import com.gym.models.Venta;
import com.gym.models.DetalleVenta;
import com.gym.models.Producto;
import com.gym.repositories.PagoRepository;
import com.gym.repositories.SuscripcionRepository;
import com.gym.repositories.ProductoRepository;
import com.gym.services.VentaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagoService {

    private final PagoRepository pagoRepository;
    private final SuscripcionRepository suscripcionRepository;
    private final VentaService ventaService;
    private final ProductoRepository productoRepository;

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
        
        // Al registrar un pago, marcamos la suscripción como PAGADO para borrar cualquier indicio de deuda pendiente.
        sus.setEstadoPago(Suscripcion.EstadoPago.PAGADO);

        // Generar Factura, Boleta o Nota de Venta (ticket interno) según se requiera
        Venta.TipoComprobante tipoComp = Venta.TipoComprobante.NOTA_VENTA;
        if (Boolean.TRUE.equals(pago.getGenerarComprobante()) && pago.getTipoComprobante() != null) {
            try {
                tipoComp = Venta.TipoComprobante.valueOf(pago.getTipoComprobante());
            } catch (Exception e) {
                log.warn("Tipo de comprobante inválido: {}, usando NOTA_VENTA", pago.getTipoComprobante());
            }
        }

        // Obtener o crear el producto genérico para membresías
        Producto membresiaProduct = productoRepository.findByNombre("Servicio de Membresía")
                .orElseGet(() -> {
                    Producto dummy = Producto.builder()
                            .nombre("Servicio de Membresía")
                            .categoria(Producto.CategoriaProducto.OTRO)
                            .descripcion("Servicio de venta de plan de membresía")
                            .precio(BigDecimal.ZERO)
                            .stock(999999)
                            .activo(true)
                            .build();
                    return productoRepository.save(dummy);
                });

        // Crear detalle de venta con el precio del plan pagado
        DetalleVenta detalle = DetalleVenta.builder()
                .producto(membresiaProduct)
                .precioUnitario(pago.getMonto())
                .cantidad(1)
                .build();

        Venta.MetodoPago metodo = Venta.MetodoPago.EFECTIVO;
        if (pago.getMetodoPago() != null) {
            try {
                metodo = Venta.MetodoPago.valueOf(pago.getMetodoPago().name());
            } catch (Exception e) {
                log.warn("Método de pago de Pago no mapea a Venta.MetodoPago: {}, usando EFECTIVO", pago.getMetodoPago());
            }
        }

        String clienteNom = pago.getClienteNombre();
        String clienteDoc = pago.getClienteDocumento();
        if (clienteNom == null || clienteNom.isBlank()) {
            clienteNom = sus.getSocio().getNombreCompleto();
        }
        if (clienteDoc == null || clienteDoc.isBlank()) {
            clienteDoc = sus.getSocio().getDni();
        }

        Venta venta = ventaService.registrarVenta(
                sus.getSocio().getId(),
                metodo,
                java.util.List.of(detalle),
                tipoComp,
                clienteNom,
                clienteDoc
        );

        pago.setVenta(venta);

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

    public List<Pago> listarTodos() {
        return pagoRepository.findAll();
    }
}
