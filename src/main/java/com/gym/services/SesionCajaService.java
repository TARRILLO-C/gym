package com.gym.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gym.models.*;
import com.gym.models.SesionCaja.EstadoSesion;
import com.gym.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Servicio de Sesiones de Caja v2.0.
 * Features: múltiples turnos, cierre ciego, fondo para siguiente turno.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SesionCajaService {

    private final SesionCajaRepository sesionRepo;
    private final VentaRepository ventaRepository;
    private final PagoRepository pagoRepository;
    private final MovimientoCajaRepository movimientoRepo;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    // ─────────────────────────────────────────────
    //  APERTURA DE SESIÓN (Feature 1)
    // ─────────────────────────────────────────────

    @Transactional
    public SesionCaja abrirSesion(String username, BigDecimal montoInicial,
                                   String turno, String observaciones) {
        if (montoInicial != null && montoInicial.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El monto inicial no puede ser negativo.");
        }
        // Regla: no puede haber más de una sesión ABIERTA al mismo tiempo
        Optional<SesionCaja> sesionActiva = sesionRepo.findByEstado(EstadoSesion.ABIERTA);
        if (sesionActiva.isPresent()) {
            SesionCaja abierta = sesionActiva.get();
            throw new IllegalStateException(
                String.format("Ya hay una sesión abierta: Turno '%s', aperturada por %s a las %s. " +
                              "Ciérrela antes de iniciar una nueva.",
                    abierta.getTurno(), abierta.getUsername(),
                    abierta.getAperturaAt().toString()));
        }

        SesionCaja nueva = SesionCaja.builder()
                .username(username)
                .turno(turno != null && !turno.isBlank() ? turno : "General")
                .montoInicial(montoInicial != null ? montoInicial : BigDecimal.ZERO)
                .aperturaAt(LocalDateTime.now())
                .estado(EstadoSesion.ABIERTA)
                .observaciones(observaciones)
                .build();

        log.info("Sesión de caja abierta: turno='{}', usuario='{}', fondo=S/{}", 
                 nueva.getTurno(), username, nueva.getMontoInicial());
        return sesionRepo.save(nueva);
    }

    // ─────────────────────────────────────────────
    //  CONSULTAR SESIÓN ACTIVA
    // ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<SesionCaja> obtenerSesionActiva() {
        return sesionRepo.findByEstado(EstadoSesion.ABIERTA);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerResumenSesionActiva() {
        SesionCaja sesion = sesionRepo.findByEstado(EstadoSesion.ABIERTA)
                .orElseThrow(() -> new IllegalStateException("No hay sesión de caja abierta."));
        return construirResumen(sesion);
    }

    // ─────────────────────────────────────────────
    //  CIERRE CIEGO (Feature 3)
    // ─────────────────────────────────────────────

    @Transactional
    public SesionCaja cerrarSesion(Long sesionId, BigDecimal montoFinalReal,
                                    BigDecimal fondoParaSiguiente, String observaciones) {
        SesionCaja sesion = sesionRepo.findById(sesionId)
                .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada: " + sesionId));

        if (sesion.getEstado() != EstadoSesion.ABIERTA) {
            throw new IllegalStateException("La sesión ya fue cerrada.");
        }

        if (montoFinalReal != null && montoFinalReal.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El monto físico real no puede ser negativo.");
        }
        if (fondoParaSiguiente != null && fondoParaSiguiente.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El fondo para el siguiente turno no puede ser negativo.");
        }

        // Calcular monto esperado INTERNAMENTE — nunca se reveló al cajero
        Map<String, Object> resumen = construirResumen(sesion);
        BigDecimal montoEsperado = (BigDecimal) resumen.get("montoEsperadoEfectivo");

        BigDecimal diferencia = montoFinalReal.subtract(montoEsperado)
                                              .setScale(2, RoundingMode.HALF_UP);

        // Determinar estado según tolerancia de S/0.50
        EstadoSesion estadoFinal;
        if (diferencia.abs().compareTo(new BigDecimal("0.50")) <= 0) {
            estadoFinal = EstadoSesion.CUADRADA;
        } else if (diferencia.compareTo(BigDecimal.ZERO) < 0) {
            estadoFinal = EstadoSesion.FALTANTE;
        } else {
            estadoFinal = EstadoSesion.SOBRANTE;
        }

        sesion.setMontoFinalEsperado(montoEsperado);
        sesion.setMontoFinalReal(montoFinalReal);
        sesion.setDiferencia(diferencia);
        sesion.setFondoParaSiguiente(fondoParaSiguiente != null ? fondoParaSiguiente : BigDecimal.ZERO);
        sesion.setEstado(estadoFinal);
        sesion.setCierreAt(LocalDateTime.now());
        sesion.setObservaciones(observaciones);

        // Guardar snapshot JSON para auditoría histórica
        try {
            sesion.setResumenJson(objectMapper.writeValueAsString(resumen));
        } catch (Exception e) {
            log.warn("No se pudo serializar el resumen JSON del cierre.", e);
        }

        log.info("Sesión {} cerrada. Estado: {}. Diferencia: S/{}", sesionId, estadoFinal, diferencia);
        return sesionRepo.save(sesion);
    }

    // ─────────────────────────────────────────────
    //  HISTORIAL
    // ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SesionCaja> listarHistorial() {
        return sesionRepo.findAllByOrderByAperturaAtDesc();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerUltimaCerrada() {
        List<SesionCaja> cerradas = sesionRepo.findUltimaCerrada();
        Map<String, Object> result = new HashMap<>();
        if (!cerradas.isEmpty()) {
            SesionCaja ultima = cerradas.get(0);
            result.put("turno", ultima.getTurno());
            result.put("cerradaAt", ultima.getCierreAt());
            result.put("fondoParaSiguiente", ultima.getFondoParaSiguiente());
        } else {
            result.put("fondoParaSiguiente", BigDecimal.ZERO);
        }
        return result;
    }

    // ─────────────────────────────────────────────
    //  CONSTRUCCIÓN DEL RESUMEN FINANCIERO (interno)
    // ─────────────────────────────────────────────

    public Map<String, Object> construirResumen(SesionCaja sesion) {
        Long sesionId = sesion.getId();

        // Ingresos por método de pago (pagos_venta, soporta mixtos)
        List<Object[]> ventasPorMetodo = ventaRepository.findResumenMetodosBySesion(sesionId);
        List<Object[]> pagosPorMetodo  = pagoRepository.findResumenMetodosBySesion(sesionId);

        Map<String, BigDecimal> detalle = new LinkedHashMap<>();
        BigDecimal totalGeneral = BigDecimal.ZERO;

        for (Object[] row : ventasPorMetodo) {
            String metodo = row[0].toString();
            BigDecimal monto = (BigDecimal) row[1];
            detalle.merge(metodo, monto, BigDecimal::add);
            totalGeneral = totalGeneral.add(monto);
        }
        for (Object[] row : pagosPorMetodo) {
            String metodo = row[0].toString();
            BigDecimal monto = (BigDecimal) row[1];
            detalle.merge(metodo, monto, BigDecimal::add);
            totalGeneral = totalGeneral.add(monto);
        }

        // Egresos y retiros de la sesión
        BigDecimal totalMovimientos = movimientoRepo.sumBySesionId(sesionId);

        // Efectivo esperado = fondo inicial + ingresos en efectivo - movimientos
        BigDecimal efectivoIngresos = detalle.getOrDefault("EFECTIVO", BigDecimal.ZERO);
        BigDecimal montoEsperado = sesion.getMontoInicial()
                .add(efectivoIngresos)
                .subtract(totalMovimientos)
                .setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sesionId", sesionId);
        result.put("turno", sesion.getTurno());
        result.put("aperturaAt", sesion.getAperturaAt());
        result.put("montoInicial", sesion.getMontoInicial());
        result.put("detalle", detalle);
        result.put("totalIngresos", totalGeneral.setScale(2, RoundingMode.HALF_UP));
        result.put("totalMovimientos", totalMovimientos.setScale(2, RoundingMode.HALF_UP));
        result.put("montoEsperadoEfectivo", montoEsperado);
        return result;
    }

    // ─────────────────────────────────────────────
    //  VALIDAR SESIÓN ACTIVA (usado por VentaService)
    // ─────────────────────────────────────────────

    public SesionCaja obtenerSesionActivaOFallar() {
        return sesionRepo.findByEstado(EstadoSesion.ABIERTA)
                .orElseThrow(() -> new IllegalStateException(
                        "No se pueden registrar transacciones: No hay sesión de caja abierta."));
    }

    // ─────────────────────────────────────────────
    //  VALIDAR PIN ADMIN (Feature 2 y 5)
    // ─────────────────────────────────────────────

    public void validarPinAdmin(String pinAdmin) {
        if (pinAdmin == null || pinAdmin.isBlank()) {
            throw new SecurityException("Se requiere el PIN de administrador para esta operación.");
        }
        boolean pinValido = usuarioRepository.findAll().stream()
                .anyMatch(u -> "ADMIN".equalsIgnoreCase(u.getRol())
                            && u.isActivo()
                            && pinAdmin.equals(u.getPinAdmin()));
        if (!pinValido) {
            throw new SecurityException("PIN de administrador incorrecto o no autorizado.");
        }
    }
}
