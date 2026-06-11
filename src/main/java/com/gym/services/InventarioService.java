package com.gym.services;

import com.gym.dtos.inventario.AjusteInventarioRequest;
import com.gym.dtos.inventario.MovimientoInventarioResponse;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.MovimientoInventario;
import com.gym.models.Producto;
import com.gym.repositories.MovimientoInventarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventarioService {

    private final ProductoService productoService;
    private final MovimientoInventarioRepository movimientoRepository;

    @Transactional
    public MovimientoInventarioResponse ajustarStock(AjusteInventarioRequest request) {
        Producto producto = productoService.buscarPorId(request.getProductoId());
        Integer stockAnterior = producto.getStock();
        Integer cantidad = request.getCantidad();
        Integer stockNuevo;
        MovimientoInventario.TipoMovimiento tipo;

        try {
            tipo = MovimientoInventario.TipoMovimiento.valueOf(request.getTipo().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Tipo de movimiento inválido. Use: ENTRADA, SALIDA o AJUSTE");
        }

        switch (tipo) {
            case ENTRADA:
                stockNuevo = stockAnterior + cantidad;
                break;
            case SALIDA:
                if (stockAnterior < cantidad) {
                    throw new IllegalStateException("Stock insuficiente. Disponible: " + stockAnterior
                            + ", solicitado: " + cantidad);
                }
                stockNuevo = stockAnterior - cantidad;
                break;
            case AJUSTE:
                stockNuevo = cantidad;
                break;
            default:
                throw new IllegalArgumentException("Tipo no soportado: " + tipo);
        }

        producto.setStock(stockNuevo);
        productoService.guardar(producto);

        MovimientoInventario movimiento = MovimientoInventario.builder()
                .producto(producto)
                .tipo(tipo)
                .cantidad(cantidad)
                .stockAnterior(stockAnterior)
                .stockNuevo(stockNuevo)
                .motivo(request.getMotivo())
                .referencia(request.getReferencia())
                .build();

        movimiento = movimientoRepository.save(movimiento);

        log.info("Ajuste de inventario: Producto '{}' | {} | {} unidades | Stock: {} -> {} | Motivo: {}",
                producto.getNombre(), tipo, cantidad, stockAnterior, stockNuevo, request.getMotivo());

        return toResponse(movimiento);
    }

    @Transactional(readOnly = true)
    public List<MovimientoInventarioResponse> listarMovimientos(Long productoId) {
        List<MovimientoInventario> movimientos;
        if (productoId != null) {
            movimientos = movimientoRepository.findByProductoIdOrderByFechaCreacionDesc(productoId);
        } else {
            movimientos = movimientoRepository.findAllByOrderByFechaCreacionDesc();
        }
        return movimientos.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MovimientoInventarioResponse buscarPorId(Long id) {
        MovimientoInventario m = movimientoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("MovimientoInventario", id));
        return toResponse(m);
    }

    private MovimientoInventarioResponse toResponse(MovimientoInventario m) {
        return MovimientoInventarioResponse.builder()
                .id(m.getId())
                .productoId(m.getProducto().getId())
                .productoNombre(m.getProducto().getNombre())
                .categoria(m.getProducto().getCategoriaNombre())
                .precio(m.getProducto().getPrecio())
                .tipo(m.getTipo().name())
                .cantidad(m.getCantidad())
                .stockAnterior(m.getStockAnterior())
                .stockNuevo(m.getStockNuevo())
                .motivo(m.getMotivo())
                .referencia(m.getReferencia())
                .fechaCreacion(m.getFechaCreacion())
                .build();
    }
}
