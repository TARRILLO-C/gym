package com.gym.services;

import com.gym.models.CierreCaja;
import com.gym.models.Egreso;
import com.gym.repositories.CierreCajaRepository;
import com.gym.repositories.EgresoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EgresoService {

    private final EgresoRepository egresoRepository;
    private final CierreCajaRepository cierreCajaRepository;

    @Transactional
    public Egreso registrarEgreso(String descripcion, BigDecimal monto, String username) {
        // Validación de caja abierta
        CierreCaja cajaHoy = cierreCajaRepository.findByFecha(LocalDate.now())
                .orElseThrow(() -> new IllegalStateException("No se pueden registrar egresos si la caja no está abierta."));

        if (!"ABIERTO".equals(cajaHoy.getEstado())) {
            throw new IllegalStateException("La caja del día está cerrada o tiene diferencias. Debe estar ABIERTA para registrar egresos.");
        }

        if (monto == null || monto.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto del egreso debe ser mayor a cero.");
        }

        Egreso egreso = Egreso.builder()
                .descripcion(descripcion)
                .monto(monto)
                .fecha(LocalDateTime.now())
                .username(username)
                .build();

        return egresoRepository.save(egreso);
    }

    @Transactional(readOnly = true)
    public List<Egreso> obtenerEgresosDeHoy() {
        LocalDateTime desde = LocalDate.now().atStartOfDay();
        LocalDateTime hasta = LocalDate.now().atTime(LocalTime.MAX);
        return egresoRepository.findByFechaBetweenOrderByFechaDesc(desde, hasta);
    }

    @Transactional(readOnly = true)
    public List<Egreso> obtenerEgresosPorFecha(LocalDate fecha) {
        LocalDateTime desde = fecha.atStartOfDay();
        LocalDateTime hasta = fecha.atTime(LocalTime.MAX);
        return egresoRepository.findByFechaBetweenOrderByFechaDesc(desde, hasta);
    }
}
