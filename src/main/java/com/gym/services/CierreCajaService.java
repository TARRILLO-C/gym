package com.gym.services;

import com.gym.models.CierreCaja;
import com.gym.repositories.CierreCajaRepository;
import com.gym.repositories.EgresoRepository;
import com.gym.repositories.PagoRepository;
import com.gym.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CierreCajaService {

    private final CierreCajaRepository cierreCajaRepository;
    private final VentaRepository ventaRepository;
    private final PagoRepository pagoRepository;
    private final EgresoRepository egresoRepository;

    @Transactional
    public CierreCaja abrirCaja(String username, BigDecimal montoInicial, String observaciones) {
        LocalDate hoy = LocalDate.now();

        // Control de auditoría: verificar si hay alguna caja abierta de días anteriores
        List<CierreCaja> cajasAbiertas = cierreCajaRepository.findByEstado("ABIERTO");
        for (CierreCaja caja : cajasAbiertas) {
            if (!caja.getFecha().equals(hoy)) {
                throw new RuntimeException("Existe una caja abierta del día anterior (" + caja.getFecha() + "). Debe cerrarla antes de abrir una nueva.");
            }
        }

        if (cierreCajaRepository.findByFecha(hoy).isPresent()) {
            throw new RuntimeException("Ya se ha registrado una caja para el día de hoy (sea abierta o cerrada). No se permite abrir más de una caja al día.");
        }

        CierreCaja cierre = CierreCaja.builder()
                 .fecha(hoy)
                 .username(username)
                 .montoInicial(montoInicial)
                 .estado("ABIERTO")
                 .observaciones(observaciones)
                 .createdAt(LocalDateTime.now())
                 .build();

        return cierreCajaRepository.save(cierre);
    }

    @Transactional(readOnly = true)
    public CierreCaja obtenerCierreDelDia() {
        return cierreCajaRepository.findByFecha(LocalDate.now()).orElse(null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerResumenCaja(LocalDate fecha) {
        LocalDateTime desde = fecha.atStartOfDay();
        LocalDateTime hasta = fecha.atTime(LocalTime.MAX);

        List<Object[]> ventasDelDia = ventaRepository.findResumenMetodos(desde, hasta);
        List<Object[]> pagosDelDia = pagoRepository.findResumenMetodos(desde, hasta);
        BigDecimal egresosDelDia = egresoRepository.sumEgresosByFecha(desde, hasta);
        if (egresosDelDia == null) {
            egresosDelDia = BigDecimal.ZERO;
        }

        Map<String, BigDecimal> resumen = new HashMap<>();
        BigDecimal totalGeneral = BigDecimal.ZERO;

        for (Object[] row : ventasDelDia) {
            String metodo = row[0].toString();
            BigDecimal total = (BigDecimal) row[1];
            resumen.merge(metodo, total, BigDecimal::add);
            totalGeneral = totalGeneral.add(total);
        }

        for (Object[] row : pagosDelDia) {
            String metodo = row[0].toString();
            BigDecimal total = (BigDecimal) row[1];
            resumen.merge(metodo, total, BigDecimal::add);
            totalGeneral = totalGeneral.add(total);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("detalle", resumen);
        result.put("total", totalGeneral.setScale(2, RoundingMode.HALF_UP));
        result.put("egresos", egresosDelDia.setScale(2, RoundingMode.HALF_UP));
        result.put("fecha", fecha.toString());
        return result;
    }

    @Transactional
    public CierreCaja cerrarCaja(Long cierreId, BigDecimal montoFinalReal, String observaciones) {
        CierreCaja cierre = cierreCajaRepository.findById(cierreId)
                .orElseThrow(() -> new RuntimeException("Cierre de caja no encontrado: " + cierreId));

        if (!"ABIERTO".equals(cierre.getEstado())) {
            throw new RuntimeException("La caja ya fue cerrada.");
        }

        Map<String, Object> resumen = obtenerResumenCaja(cierre.getFecha());
        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> detalle = (Map<String, BigDecimal>) resumen.get("detalle");
        BigDecimal totalEfectivo = detalle != null ? detalle.getOrDefault("EFECTIVO", BigDecimal.ZERO) : BigDecimal.ZERO;
        BigDecimal totalEgresos = (BigDecimal) resumen.getOrDefault("egresos", BigDecimal.ZERO);
        BigDecimal montoEsperado = totalEfectivo.add(cierre.getMontoInicial()).subtract(totalEgresos);
        BigDecimal diferencia = montoFinalReal.subtract(montoEsperado);

        cierre.setMontoFinalEsperado(montoEsperado);
        cierre.setMontoFinalReal(montoFinalReal);
        cierre.setDiferencia(diferencia);
        cierre.setObservaciones(observaciones);
        cierre.setClosedAt(LocalDateTime.now());

        if (diferencia.abs().compareTo(new BigDecimal("0.50")) > 0) {
            cierre.setEstado("DIFERENCIA");
        } else {
            cierre.setEstado("CERRADO");
        }

        try {
            cierre.setResumenJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(resumen));
        } catch (Exception e) {
            log.warn("No se pudo serializar el resumen JSON", e);
        }

        return cierreCajaRepository.save(cierre);
    }

    @Transactional(readOnly = true)
    public List<CierreCaja> listarHistorial() {
        return cierreCajaRepository.findAll();
    }
}
