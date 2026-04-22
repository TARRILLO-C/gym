package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.exceptions.SuscripcionInactivaException;
import com.gym.models.Asistencia;
import com.gym.models.Socio;
import com.gym.repositories.AsistenciaRepository;
import com.gym.repositories.SocioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Servicio de control de acceso (asistencia) del gimnasio.
 *
 * <p>Implementa la lógica del Paso 4: registrar ingreso solo si el socio
 * tiene una suscripción activa y vigente.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AsistenciaService {

    private final AsistenciaRepository  asistenciaRepository;
    private final SocioRepository       socioRepository;
    private final SuscripcionService    suscripcionService;

    // ── Control de acceso (Paso 4) ────────────────────────────────────────────

    /**
     * Registra el ingreso de un socio identificado por su DNI.
     *
     * <p>Flujo:
     * <ol>
     *   <li>Busca el socio por DNI. → 404 si no existe.</li>
     *   <li>Verifica que el socio tenga suscripción activa y pagada hoy. → 403 si no.</li>
     *   <li>Persiste el registro de asistencia con la fecha/hora actual.</li>
     * </ol>
     *
     * @param dni DNI del socio que desea ingresar
     * @return registro de {@link Asistencia} persistido
     * @throws ResourceNotFoundException    si el DNI no pertenece a ningún socio
     * @throws SuscripcionInactivaException si el socio no tiene suscripción vigente
     */
    @Transactional
    public Asistencia registrarIngresoPorDni(String dni) {
        // 1. Buscar socio por DNI
        Socio socio = socioRepository.findByDni(dni)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No se encontró ningún socio con DNI: " + dni));

        if (socio.getEstado() == Socio.EstadoSocio.INACTIVO) {
            throw new SuscripcionInactivaException("ACCESO DENEGADO. El perfil del socio se encuentra INACTIVO en el sistema.");
        }

        // 2. Verificar suscripción activa (lanza SuscripcionInactivaException si no tiene)
        suscripcionService.obtenerSuscripcionActivaOFallar(socio.getId());

        // 3. Registrar ingreso
        Asistencia asistencia = Asistencia.builder()
                .socio(socio)
                .fechaHoraIngreso(LocalDateTime.now())
                .build();

        Asistencia guardada = asistenciaRepository.save(asistencia);
        log.info("✅ Ingreso registrado: {} (DNI: {}) — {}",
                socio.getNombreCompleto(), dni, guardada.getFechaHoraIngreso());
        return guardada;
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Lista todos los registros de asistencia históricos.
     */
    @Transactional(readOnly = true)
    public List<Asistencia> listarTodas() {
        return asistenciaRepository.findAll();
    }

    /**
     * Lista las asistencias de un socio específico.
     *
     * @throws ResourceNotFoundException si el socio no existe
     */
    @Transactional(readOnly = true)
    public List<Asistencia> listarPorSocio(Long socioId) {
        if (!socioRepository.existsById(socioId)) {
            throw new ResourceNotFoundException("Socio", socioId);
        }
        return asistenciaRepository.findBySocioId(socioId);
    }

    /**
     * Retorna todas las asistencias registradas en el día de hoy.
     */
    @Transactional(readOnly = true)
    public List<Asistencia> listarDeHoy() {
        LocalDate hoy       = LocalDate.now();
        LocalDateTime desde = hoy.atStartOfDay();
        LocalDateTime hasta = hoy.atTime(LocalTime.MAX);
        return asistenciaRepository.findByFechaHoraIngresoBetween(desde, hasta);
    }
}
