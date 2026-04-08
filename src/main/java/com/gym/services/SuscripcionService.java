package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.exceptions.SuscripcionInactivaException;
import com.gym.models.Congelamiento;
import com.gym.models.Membresia;
import com.gym.models.Socio;
import com.gym.models.Suscripcion;
import com.gym.models.Suscripcion.EstadoPago;
import com.gym.repositories.CongelamientoRepository;
import com.gym.repositories.MembresiaRepository;
import com.gym.repositories.SocioRepository;
import com.gym.repositories.SuscripcionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

/**
 * Servicio de negocio para la entidad {@link Suscripcion}.
 *
 * <p>Centraliza la lógica de creación de suscripciones, verificación de vigencia
 * y consulta del estado de pago de un socio.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SuscripcionService {

    private final SuscripcionRepository suscripcionRepository;
    private final SocioRepository       socioRepository;
    private final MembresiaRepository   membresiaRepository;
    private final CongelamientoRepository congelamientoRepository;

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Lista todas las suscripciones del sistema.
     */
    @Transactional(readOnly = true)
    public List<Suscripcion> listarTodas() {
        return suscripcionRepository.findAll();
    }

    /**
     * Busca una suscripción por ID.
     *
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public Suscripcion buscarPorId(Long id) {
        return suscripcionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Suscripción", id));
    }

    /**
     * Lista todas las suscripciones de un socio dado.
     */
    @Transactional(readOnly = true)
    public List<Suscripcion> listarPorSocio(Long socioId) {
        // Verifica que el socio exista antes de consultar
        if (!socioRepository.existsById(socioId)) {
            throw new ResourceNotFoundException("Socio", socioId);
        }
        return suscripcionRepository.findBySocioId(socioId);
    }

    // ── Verificación de vigencia (lógica central del paso 2) ──────────────────

    /**
     * Verifica si un socio tiene una suscripción <strong>activa y vigente</strong> hoy.
     *
     * <p>Una suscripción es válida cuando:
     * <ul>
     *   <li>Su estado de pago es {@code PAGADO}</li>
     *   <li>Su fecha de fin es igual o posterior a la fecha de hoy</li>
     * </ul>
     *
     * @param socioId ID del socio a verificar
     * @return {@code true} si el socio tiene membresía vigente; {@code false} en caso contrario
     * @throws ResourceNotFoundException si el socio no existe
     */
    @Transactional(readOnly = true)
    public boolean tieneSuscripcionActiva(Long socioId) {
        if (!socioRepository.existsById(socioId)) {
            throw new ResourceNotFoundException("Socio", socioId);
        }
        Optional<Suscripcion> activa = suscripcionRepository
                .findSuscripcionActivaBySocio(socioId, EstadoPago.PAGADO, LocalDate.now());
        return activa.isPresent();
    }

    /**
     * Retorna la suscripción activa de un socio, o lanza excepción si no posee ninguna.
     *
     * @param socioId ID del socio
     * @return suscripción vigente
     * @throws SuscripcionInactivaException si no hay suscripción activa
     */
    @Transactional(readOnly = true)
    public Suscripcion obtenerSuscripcionActivaOFallar(Long socioId) {
        Suscripcion sus = suscripcionRepository
                .findSuscripcionActivaBySocio(socioId, EstadoPago.PAGADO, LocalDate.now())
                .orElseThrow(() -> new SuscripcionInactivaException(
                        "El socio no posee una suscripción activa y vigente."));

        // Bloqueo por deuda técnica: si tiene fecha de próximo cobro vencida.
        // Si es null (socio antiguo), usamos fechaFin como referencia de seguridad.
        LocalDate limiteCobro = sus.getFechaProximoCobro() != null ? sus.getFechaProximoCobro() : sus.getFechaFin();
        
        if (limiteCobro != null && limiteCobro.isBefore(LocalDate.now())) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. Debe regularizar su mensualidad. Fecha de cobro vencida el: " + limiteCobro);
        }

        return sus;
    }

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Crea y persiste una nueva suscripción para un socio y una membresía dados.
     *
     * <p>La fecha de fin se calcula automáticamente sumando
     * {@code membresia.duracionDias} a la fecha de inicio provista.</p>
     *
     * @param socioId     ID del socio
     * @param membresiaId ID de la membresía contratada
     * @param fechaInicio fecha en que inicia la suscripción
     * @param estadoPago  estado de pago inicial (usualmente PAGADO)
     * @return suscripción persistida
     */
    @Transactional
    public Suscripcion crear(Long socioId, Long membresiaId,
                             LocalDate fechaInicio, EstadoPago estadoPago) {

        if (socioId == null || membresiaId == null) {
            throw new IllegalArgumentException("El ID del socio y de la membresía son obligatorios.");
        }

        if (tieneSuscripcionActiva(socioId)) {
            throw new com.gym.exceptions.DuplicateResourceException(
                "El socio ya cuenta con una membresía activa y vigente.");
        }

        Socio socio = socioRepository.findById(socioId)
                .orElseThrow(() -> new ResourceNotFoundException("Socio", socioId));

        Membresia membresia = membresiaRepository.findById(membresiaId)
                .orElseThrow(() -> new ResourceNotFoundException("Membresía", membresiaId));

        // Fecha de fin = fecha de inicio + duración en días del plan
        LocalDate fechaFin = fechaInicio.plusDays(membresia.getDuracionDias());
        
        // Fecha de próximo cobro: 30 días después o igual a fechaFin si es corto
        LocalDate proximoCobro = null;
        if (membresia.getPrecioMensual() != null && membresia.getDuracionDias() > 30) {
            proximoCobro = fechaInicio.plusDays(30);
        } else {
            proximoCobro = fechaFin;
        }

        Suscripcion suscripcion = Suscripcion.builder()
                .socio(socio)
                .membresia(membresia)
                .fechaInicio(fechaInicio)
                .fechaFin(fechaFin)
                .fechaProximoCobro(proximoCobro)
                .estadoPago(estadoPago != null ? estadoPago : EstadoPago.PAGADO)
                .build();

        log.info("Cálculo de cobro: Plan={}, PrecioMensual={}, PróximoCobro={}", 
                 membresia.getNombre(), membresia.getPrecioMensual(), proximoCobro);

        Suscripcion guardada = suscripcionRepository.save(suscripcion);
        log.info("Suscripción creada: socio={}, membresía={}, vigencia={} → {}",
                socioId, membresiaId, fechaInicio, fechaFin);
        return guardada;
    }

    /**
     * Actualiza el estado de pago de una suscripción existente.
     *
     * @param id         ID de la suscripción
     * @param estadoPago nuevo estado (PAGADO, PENDIENTE, VENCIDO)
     * @return suscripción actualizada
     */
    @Transactional
    public Suscripcion actualizarEstadoPago(Long id, EstadoPago estadoPago) {
        Suscripcion sus = buscarPorId(id);
        sus.setEstadoPago(estadoPago);
        log.info("Suscripción ID {} → estado de pago actualizado a {}", id, estadoPago);
        return suscripcionRepository.save(sus);
    }

    /**
     * Congela una suscripción activa, pausándola y extendiendo su fecha de fin.
     */
    @Transactional
    public Congelamiento congelar(Long id, LocalDate inicio, LocalDate fin, String motivo) {
        Suscripcion sus = buscarPorId(id);
        
        long dias = ChronoUnit.DAYS.between(inicio, fin);
        if (dias <= 0) {
            throw new IllegalArgumentException("La fecha de fin debe ser posterior a la de inicio.");
        }

        // Extender la fecha de fin de la suscripción
        sus.setFechaFin(sus.getFechaFin().plusDays(dias));
        sus.setEstaCongelada(true);
        suscripcionRepository.save(sus);

        Congelamiento cong = Congelamiento.builder()
                .suscripcion(sus)
                .fechaInicio(inicio)
                .fechaFin(fin)
                .motivo(motivo)
                .build();

        log.info("Suscripción {} congelada por {} días.", id, dias);
        return congelamientoRepository.save(cong);
    }

    /**
     * Descongela una suscripción (opcional si se desea manejar manualmente).
     */
    @Transactional
    public void descongelar(Long id) {
        Suscripcion sus = buscarPorId(id);
        sus.setEstaCongelada(false);
        suscripcionRepository.save(sus);
    }

    /**
     * Realiza una renovación rápida de una suscripción usando el mismo plan.
     */
    @Transactional
    public Suscripcion renovar(Long id) {
        Suscripcion anterior = buscarPorId(id);
        
        // La nueva suscripción inicia el día que vence la anterior (o hoy si ya venció)
        LocalDate inicioVigencia = anterior.getFechaFin().isBefore(LocalDate.now()) 
                                   ? LocalDate.now() 
                                   : anterior.getFechaFin();

        return crear(anterior.getSocio().getId(), anterior.getMembresia().getId(), inicioVigencia, EstadoPago.PAGADO);
    }

    /**
     * Retorna suscripciones que vencen en los próximos 7 días.
     */
    @Transactional(readOnly = true)
    public List<Suscripcion> listarVencenEstaSemana() {
        LocalDate hoy = LocalDate.now();
        return suscripcionRepository.findByFechaFinBetween(hoy, hoy.plusDays(7));
    }

    /**
     * Retorna suscripciones ya vencidas.
     */
    @Transactional(readOnly = true)
    public List<Suscripcion> listarVencidas() {
        return suscripcionRepository.findByFechaFinBefore(LocalDate.now());
    }

    /**
     * Elimina una suscripción por su ID.
     */
    @Transactional
    public void eliminar(Long id) {
        Suscripcion sus = buscarPorId(id);
        suscripcionRepository.delete(sus);
        log.info("Suscripción ID {} eliminada.", id);
    }
}
