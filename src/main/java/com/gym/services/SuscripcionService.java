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
        
        List<Suscripcion> vigentes = suscripcionRepository.findVigentesParaHoy(socioId);
        if (vigentes.isEmpty()) return false;
        
        Suscripcion sus = vigentes.get(0);
        if (!sus.isActivo()) return false;
        if (sus.isEstaCongelada()) return false;
        if (sus.getEstadoPago() != EstadoPago.PAGADO) return false;
        
        LocalDate limiteCobro = sus.getFechaProximoCobro() != null ? sus.getFechaProximoCobro() : sus.getFechaFin();
        if (limiteCobro != null && limiteCobro.isBefore(LocalDate.now())) return false;

        return true;
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
        List<Suscripcion> vigentes = suscripcionRepository.findVigentesParaHoy(socioId);
        
        if (vigentes.isEmpty()) {
            throw new SuscripcionInactivaException("ACCESO DENEGADO. El socio no posee una suscripción activa para el día de hoy.");
        }
        
        Suscripcion sus = vigentes.get(0);

        if (!sus.isActivo()) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. El plan actual de este socio ha sido ANULADO o CANCELADO.");
        }
        
        if (sus.getFechaFin() != null && sus.getFechaFin().isBefore(LocalDate.now())) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. La membresía se encuentra VENCIDA desde el " + sus.getFechaFin() + ".");
        }
        
        if (sus.getFechaInicio() != null && sus.getFechaInicio().isAfter(LocalDate.now())) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. Su plan de membresía inicia recién a partir del " + sus.getFechaInicio() + ".");
        }

        if (sus.isEstaCongelada()) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. La suscripción se encuentra congelada.");
        }

        if (sus.getEstadoPago() == EstadoPago.PENDIENTE || sus.getEstadoPago() == EstadoPago.VENCIDO) {
            throw new SuscripcionInactivaException(
                    "ACCESO DENEGADO. El socio presenta una DEUDA pendiente en su plan actual.");
        }

        LocalDate limiteCobro = sus.getFechaProximoCobro() != null ? sus.getFechaProximoCobro() : sus.getFechaFin();
        
        if (limiteCobro != null && !limiteCobro.isAfter(LocalDate.now())) {
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
                             LocalDate fechaInicio, EstadoPago estadoPago, Boolean pagoTotal) {

        if (socioId == null || membresiaId == null) {
            throw new IllegalArgumentException("El ID del socio y de la membresía son obligatorios.");
        }

        // Ya no lanzamos DuplicateResourceException.
        // Obtener dependencias necesarias
        Socio socio = socioRepository.findById(socioId)
                .orElseThrow(() -> new ResourceNotFoundException("Socio", socioId));

        Membresia membresia = membresiaRepository.findById(membresiaId)
                .orElseThrow(() -> new ResourceNotFoundException("Membresía", membresiaId));

        // Encolamiento: Obtener la última suscripción que tuvo el usuario para empalmar las fechas
        Optional<Suscripcion> ultimaOpt = suscripcionRepository
                .findFirstBySocioIdAndActivoTrueOrderByFechaFinDesc(socioId);
                
        if (ultimaOpt.isPresent() && !ultimaOpt.get().getFechaFin().isBefore(LocalDate.now())) {
            // FORZAR ENCOLAMIENTO: Si la membresía termina hoy o en el futuro, ignoramos la fecha
            // que mande el frontend y la obligamos a empezar un día después de su vencimiento actual.
            fechaInicio = ultimaOpt.get().getFechaFin().plusDays(1);
            log.info("Encolando nueva suscripción para Socio {}. Iniciará FORZOSAMENTE el {}", socioId, fechaInicio);
        } else {
            // Si el socio es nuevo o su plan anterior ya expiró en el pasado, usamos la fecha 
            // que envió el frontend (o la fecha de hoy si no envió nada).
            if (fechaInicio == null) {
                fechaInicio = LocalDate.now();
            }
        }
            
        Suscripcion suscripcion = Suscripcion.builder()
                .socio(socio)
                .membresia(membresia)
                .fechaInicio(fechaInicio)
                .fechaFin(fechaInicio.plusDays(membresia.getDuracionDias()))
                .build();

        // Fecha de próximo cobro y estado financiero
        suscripcion.setEstadoPago(estadoPago != null ? estadoPago : EstadoPago.PAGADO);
        
        if (pagoTotal != null && pagoTotal) {
            // Pagó el total de golpe (promo), su próximo cobro es cuando acabe el plan
            suscripcion.setFechaProximoCobro(suscripcion.getFechaFin());
            suscripcion.setEstadoPago(EstadoPago.PAGADO);
        } else if (membresia.getPrecioCuota() != null && membresia.getFrecuenciaCobroDias() != null) {
            LocalDate baseCobro = (suscripcion.getFechaInicio() != null) ? suscripcion.getFechaInicio() : LocalDate.now();
            suscripcion.setFechaProximoCobro(baseCobro.plusDays(membresia.getFrecuenciaCobroDias()));
            if (estadoPago == null) suscripcion.setEstadoPago(EstadoPago.PENDIENTE);
        } else {
            suscripcion.setFechaProximoCobro(suscripcion.getFechaFin());
        }

        Suscripcion guardada = suscripcionRepository.save(suscripcion);
        log.info("Suscripción procesada exitosamente: socio={}, membresía={}, fin={}", socioId, membresiaId, suscripcion.getFechaFin());
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
        
        if (sus.getMembresia() != null 
            && sus.getMembresia().getPermiteCongelamiento() != null 
            && !sus.getMembresia().getPermiteCongelamiento()) {
            throw new IllegalArgumentException("Las políticas de este plan de membresía no permiten congelamientos.");
        }
        
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
        
        // Buscar el último congelamiento registrado por ID (evita error de empates el mismo día)
        java.util.Optional<com.gym.models.Congelamiento> ultimoOpt = congelamientoRepository.findFirstBySuscripcionIdOrderByIdDesc(id);
        
        if (ultimoOpt.isPresent()) {
            com.gym.models.Congelamiento cong = ultimoOpt.get();
            LocalDate hoy = LocalDate.now();
            
            // Si el socio regresa ANTES de la fecha planificada de fin
            if (!hoy.isAfter(cong.getFechaFin()) && !hoy.isBefore(cong.getFechaInicio())) {
                long diasNoUsados = java.time.temporal.ChronoUnit.DAYS.between(hoy, cong.getFechaFin());
                
                if (diasNoUsados > 0) {
                    // Amputar los días que se le habían regalado de más
                    sus.setFechaFin(sus.getFechaFin().minusDays(diasNoUsados));
                    // Actualizar el historial para que acabe hoy
                    cong.setFechaFin(hoy);
                    congelamientoRepository.save(cong);
                    
                    log.info("Descongelamiento anticipado para {}. Días retirados: {}", id, diasNoUsados);
                }
            }
        }
        
        sus.setEstaCongelada(false);
        suscripcionRepository.save(sus);
    }

    /**
     * Realiza una renovación rápida de una suscripción usando el mismo plan.
     * En lugar de crear un duplicado, extiende la vigencia de la actual.
     */
    @Transactional
    public Suscripcion renovar(Long id) {
        Suscripcion anterior = buscarPorId(id);
        
        // En el nuevo modelo, renovar implica generar una NUEVA fila con el mismo plan encolada,
        // no modificar la fila antigua. Reutilizamos crear() para delegarle la lógica de fechas y encolamiento.
        log.info("Solicitud de renovación para suscripción ID {}. Se encolará un nuevo paquete idéntico.", id);
        return crear(anterior.getSocio().getId(), anterior.getMembresia().getId(), null, EstadoPago.PAGADO, false);
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
        sus.setActivo(false);
        suscripcionRepository.save(sus);
        log.info("Suscripción ID {} marcada como inactiva (borrado lógico).", id);
    }

    /**
     * Restaura una suscripción eliminada lógicamente.
     */
    @Transactional
    public void restaurar(Long id) {
        Suscripcion sus = buscarPorId(id);
        sus.setActivo(true);
        suscripcionRepository.save(sus);
        log.info("Suscripción ID {} ha sido restaurada con éxito.", id);
    }
}
