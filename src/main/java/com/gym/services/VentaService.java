package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.*;
import com.gym.models.Venta.MetodoPago;
import com.gym.repositories.SocioRepository;
import com.gym.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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

    /**
     * Registra una nueva venta de productos.
     * 
     * @param socioId    ID del socio (opcional)
     * @param metodoPago medio de pago utilizado
     * @param detalles   lista de ítems a vender
     * @return venta guardada con stock actualizado
     */
    public Venta registrarVenta(Long socioId, MetodoPago metodoPago, List<DetalleVenta> detalles) {
        Socio socio = null;
        if (socioId != null) {
            socio = socioRepository.findById(socioId)
                    .orElseThrow(() -> new ResourceNotFoundException("Socio", socioId));
        }

        Venta venta = Venta.builder()
                .socio(socio)
                .fecha(LocalDateTime.now())
                .metodoPago(metodoPago)
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal subtotalGeneral = BigDecimal.ZERO;

        for (DetalleVenta item : detalles) {
            Producto p = productoService.buscarPorId(item.getProducto().getId());

            // Validación de Stock
            if (p.getStock() < item.getCantidad()) {
                throw new IllegalStateException("Stock insuficiente para: " + p.getNombre() + 
                        " (Pedido: " + item.getCantidad() + ", Disponible: " + p.getStock() + ")");
            }

            // Descuento de Stock
            p.setStock(p.getStock() - item.getCantidad());
            productoService.crear(p); // Actualizar producto

            // Configurar ítem del detalle
            item.setPrecioUnitario(p.getPrecio());
            BigDecimal subtotalItem = p.getPrecio().multiply(BigDecimal.valueOf(item.getCantidad()));
            item.setSubtotal(subtotalItem);
            
            subtotalGeneral = subtotalGeneral.add(subtotalItem);
            venta.addDetalle(item);
        }

        venta.setTotal(subtotalGeneral);
        Venta guardada = ventaRepository.save(venta);
        
        log.info("Venta registrada ID: {} - Total: S/ {} - Socio: {}", 
                guardada.getId(), guardada.getTotal(), 
                socio != null ? socio.getNombreCompleto() : "PÚBLICO GENERAL");
        
        return guardada;
    }

    @Transactional(readOnly = true)
    public List<Venta> listarTodas() {
        return ventaRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Venta buscarPorId(Long id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta", id));
    }
}
