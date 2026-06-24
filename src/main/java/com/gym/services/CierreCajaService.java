package com.gym.services;

import com.gym.models.CierreCaja;
import com.gym.repositories.CierreCajaRepository;
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

    @Transactional
    public CierreCaja abrirCaja(String username, BigDecimal montoInicial, String observaciones) {
        LocalDate hoy = LocalDate.now();

        if (cierreCajaRepository.findByFecha(hoy).isPresent()) {
            throw new RuntimeException("Ya existe un cierre de caja abierto para hoy.");
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
        BigDecimal montoEsperado = ((BigDecimal) resumen.get("total")).add(cierre.getMontoInicial());
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
