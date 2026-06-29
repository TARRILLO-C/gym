package com.gym.services;

import com.gym.models.*;
import com.gym.repositories.MovimientoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Servicio para Movimientos de Caja.
 * Feature 5: distingue EGRESO (cajero) vs RETIRO_FONDOS (admin con PIN).
 */
@Service
@RequiredArgsConstructor
public class MovimientoCajaService {

    private final MovimientoCajaRepository movimientoRepo;
    private final SesionCajaService sesionService;

    /**
     * Registra un EGRESO (gasto operativo). Puede hacerlo el cajero.
     */
    @Transactional
    public MovimientoCaja registrarEgreso(String descripcion, BigDecimal monto, String username) {
        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (descripcion == null || descripcion.isBlank()) {
            throw new IllegalArgumentException("La descripción del egreso es obligatoria.");
        }

        SesionCaja sesion = sesionService.obtenerSesionActivaOFallar();

        MovimientoCaja mov = MovimientoCaja.builder()
                .sesion(sesion)
                .tipo(MovimientoCaja.TipoMovimiento.EGRESO)
                .descripcion(descripcion)
                .monto(monto)
                .username(username)
                .build();

        return movimientoRepo.save(mov);
    }

    /**
     * Registra un RETIRO DE FONDOS. Requiere PIN de administrador.
     */
    @Transactional
    public MovimientoCaja registrarRetiro(String descripcion, BigDecimal monto,
                                          String username, String pinAdmin) {
        // Valida PIN antes de cualquier operación
        sesionService.validarPinAdmin(pinAdmin);

        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }

        SesionCaja sesion = sesionService.obtenerSesionActivaOFallar();

        MovimientoCaja mov = MovimientoCaja.builder()
                .sesion(sesion)
                .tipo(MovimientoCaja.TipoMovimiento.RETIRO_FONDOS)
                .descripcion(descripcion)
                .monto(monto)
                .username(username)
                .autorizadoPor(username) // el admin autoriza con su propio PIN
                .build();

        return movimientoRepo.save(mov);
    }

    @Transactional(readOnly = true)
    public List<MovimientoCaja> listarPorSesion(Long sesionId) {
        return movimientoRepo.findBySesionIdOrderByFechaDesc(sesionId);
    }
}
