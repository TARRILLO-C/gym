package com.gym.services;

import com.gym.exceptions.ResourceNotFoundException;
import com.gym.exceptions.SuscripcionInactivaException;
import com.gym.models.Congelamiento;
import com.gym.models.Membresia;
import com.gym.models.Socio;
import com.gym.models.Suscripcion;
import com.gym.models.Pago;
import com.gym.models.Suscripcion.EstadoPago;
import com.gym.models.Venta;
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
    private final EmailService          emailService;
    private final PagoService           pagoService;

    // ── Helper Auto-Descongelar ──────────────────────────────────────────────

    private void verificarYDescongelarSiVencio(Suscripcion sus) {
        if (sus != null && sus.isEstaCongelada()) {
            Optional<Congelamiento> ultimoOpt = congelamientoRepository.findFirstBySuscripcionIdOrderByIdDesc(sus.getId());
            if (ultimoOpt.isPresent() && LocalDate.now().isAfter(ultimoOpt.get().getFechaFin())) {
                sus.setEstaCongelada(false);
                suscripcionRepository.save(sus);
                log.info("Auto-descongelamiento de suscripción ID {} porque su periodo de congelamiento venció el {}", sus.getId(), ultimoOpt.get().getFechaFin());
            }
        }
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional
    public List<Suscripcion> listarTodas() {
        List<Suscripcion> list = suscripcionRepository.findAll();
        list.forEach(this::verificarYDescongelarSiVencio);
        return list;
    }

    @Transactional
    public org.springframework.data.domain.Page<Suscripcion> listarTodas(org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Suscripcion> page = suscripcionRepository.findAll(pageable);
        page.forEach(this::verificarYDescongelarSiVencio);
        return page;
    }

    /**
     * Busca una suscripción por ID.
     *
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public Suscripcion buscarPorId(Long id) {
        Suscripcion sus = suscripcionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Suscripción", id));
        verificarYDescongelarSiVencio(sus);
        return sus;
    }

    /**
     * Lista todas las suscripciones de un socio dado.
     */
    @Transactional
    public List<Suscripcion> listarPorSocio(Long socioId) {
        // Verifica que el socio exista antes de consultar
        if (!socioRepository.existsById(socioId)) {
            throw new ResourceNotFoundException("Socio", socioId);
        }
        List<Suscripcion> list = suscripcionRepository.findBySocioId(socioId);
        list.forEach(this::verificarYDescongelarSiVencio);
        return list;
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
    @Transactional
    public boolean tieneSuscripcionActiva(Long socioId) {
        if (!socioRepository.existsById(socioId)) {
            throw new ResourceNotFoundException("Socio", socioId);
        }
        
        List<Suscripcion> vigentes = suscripcionRepository.findVigentesParaHoy(socioId);
        if (vigentes.isEmpty()) return false;
        
        Suscripcion sus = vigentes.get(0);
        if (!sus.isActivo()) return false;
        
        verificarYDescongelarSiVencio(sus);
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
    @Transactional
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

        verificarYDescongelarSiVencio(sus);
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
        return crear(socioId, membresiaId, fechaInicio, estadoPago, pagoTotal, false, null, null, null, null, true);
    }

    @Transactional
    public Suscripcion crear(Long socioId, Long membresiaId,
                             LocalDate fechaInicio, EstadoPago estadoPago, Boolean pagoTotal,
                             Boolean generarComprobante, String tipoComprobante, 
                             String clienteNombre, String clienteDocumento, String metodoPago) {
        return crear(socioId, membresiaId, fechaInicio, estadoPago, pagoTotal,
                     generarComprobante, tipoComprobante, clienteNombre, clienteDocumento, metodoPago, true);
    }
    @Transactional
    public Suscripcion crear(Long socioId, Long membresiaId,
                             LocalDate fechaInicio, EstadoPago estadoPago, Boolean pagoTotal,
                             Boolean generarComprobante, String tipoComprobante,
                             String clienteNombre, String clienteDocumento, String metodoPago,
                             boolean enviarCorreo) {

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
        } else if (membresia.getPrecioCuota() != null
                && membresia.getFrecuenciaCobroDias() != null
                && membresia.getFrecuenciaCobroDias() > 0) {
            // Plan fraccionado: siguiente cobro = fechaInicio + frecuencia
            LocalDate baseCobro = suscripcion.getFechaInicio() != null ? suscripcion.getFechaInicio() : LocalDate.now();
            suscripcion.setFechaProximoCobro(baseCobro.plusDays(membresia.getFrecuenciaCobroDias()));
            if (estadoPago == null) suscripcion.setEstadoPago(EstadoPago.PENDIENTE);
        } else {
            // Plan de pago único o frecuencia 0: próximo cobro = fecha fin del plan
            suscripcion.setFechaProximoCobro(suscripcion.getFechaFin());
        }

        Suscripcion guardada = suscripcionRepository.save(suscripcion);
        
        // Registrar el pago inicial si el estado es PAGADO
        // PASO 1: siempre NOTA_VENTA (igual que ventas de productos) → nunca llama a API de SUNAT aquí
        if (guardada.getEstadoPago() == EstadoPago.PAGADO) {
            java.math.BigDecimal montoPago = (pagoTotal != null && pagoTotal) ?
                    membresia.getPrecio() :
                    (membresia.getPrecioCuota() != null ? membresia.getPrecioCuota() : membresia.getPrecio());

            Pago.MetodoPago metodo = Pago.MetodoPago.EFECTIVO;
            if (metodoPago != null) {
                try {
                    metodo = Pago.MetodoPago.valueOf(metodoPago);
                } catch (Exception e) {
                    log.warn("Método de pago inválido: {}, usando EFECTIVO", metodoPago);
                }
            }

            Pago pago = Pago.builder()
                    .monto(montoPago)
                    .metodoPago(metodo)
                    .comentario("Pago inicial de suscripción")
                    .generarComprobante(false)   // siempre false → guarda como NOTA_VENTA
                    .tipoComprobante(null)
                    .clienteNombre(clienteNombre)
                    .clienteDocumento(clienteDocumento)
                    .build();

            Pago pagoPersistido = pagoService.registrarPago(guardada.getId(), pago);

            // PASO 2: Emitir comprobante electrónico por separado (igual que "EMITIR" en ventas de productos)
            // Solo si el usuario pidió boleta/factura Y hay una venta generada
            if (Boolean.TRUE.equals(generarComprobante)
                    && tipoComprobante != null
                    && pagoPersistido.getVenta() != null) {
                try {
                    Venta.TipoComprobante tipo = Venta.TipoComprobante.valueOf(tipoComprobante);
                    pagoService.emitirComprobanteEnVenta(
                            pagoPersistido.getVenta().getId(),
                            tipo,
                            clienteDocumento,
                            clienteNombre
                    );
                    log.info("Comprobante {} emitido para suscripción {}", tipoComprobante, guardada.getId());
                } catch (Exception apiEx) {
                    log.error("Fallo al emitir comprobante (suscripción guardada igualmente): {}", apiEx.getMessage());
                }
            }
        }
        
        // Enviar correo de confirmación de compra (sin bloquear si falla el SMTP)
        if (enviarCorreo) {
            try {
                emailService.enviarConfirmacionCompra(guardada);
            } catch (Exception mailEx) {
                log.warn("No se pudo enviar correo de confirmación (la suscripción fue guardada): {}", mailEx.getMessage());
            }
        }

        
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
     * Congela una suscripción activa, pausándola en la fecha indicada.
     */
    @Transactional
    public Congelamiento congelar(Long id, LocalDate inicio, LocalDate fin, String motivo) {
        Suscripcion sus = buscarPorId(id);
        
        if (sus.getMembresia() != null 
            && sus.getMembresia().getPermiteCongelamiento() != null 
            && !sus.getMembresia().getPermiteCongelamiento()) {
            throw new IllegalArgumentException("Las políticas de este plan de membresía no permiten congelamientos.");
        }

        if (sus.isEstaCongelada()) {
            throw new IllegalStateException("La suscripción ya se encuentra congelada.");
        }

        LocalDate fechaInicioCong = (inicio != null) ? inicio : LocalDate.now();
        LocalDate fechaFinTentativa = (fin != null) ? fin : fechaInicioCong.plusDays(7);

        // Guardar el estado del congelamiento activo directamente en la suscripción
        sus.setEstaCongelada(true);
        sus.setFechaCongelacion(fechaInicioCong);
        sus.setMotivoCongelacion(motivo);
        suscripcionRepository.save(sus);

        // Registrar en la tabla histórica para control de auditoría
        Congelamiento cong = Congelamiento.builder()
                .suscripcion(sus)
                .fechaInicio(fechaInicioCong)
                .fechaFin(fechaFinTentativa)
                .motivo(motivo)
                .build();

        log.info("Suscripción ID {} congelada a partir del {}. Motivo: {}", id, fechaInicioCong, motivo);
        return congelamientoRepository.save(cong);
    }

    /**
     * Descongela una suscripción calculando dinámicamente los días de pausa transcurridos y extendiendo la fecha fin.
     */
    @Transactional
    public void descongelar(Long id) {
        Suscripcion sus = buscarPorId(id);
        
        if (!sus.isEstaCongelada()) {
            throw new IllegalStateException("La suscripción no está congelada.");
        }

        if (sus.getFechaCongelacion() == null) {
            throw new IllegalStateException("No hay una fecha de congelación registrada en la suscripción.");
        }

        LocalDate hoy = LocalDate.now();
        LocalDate inicioCongelacion = sus.getFechaCongelacion();
        
        // Calcular los días reales transcurridos de pausa
        long diasTranscurridos = ChronoUnit.DAYS.between(inicioCongelacion, hoy);
        if (diasTranscurridos < 0) {
            diasTranscurridos = 0; // Evitar anomalías horarias
        }

        // Extender la fecha de fin sumándole los días de pausa transcurridos
        sus.setFechaFin(sus.getFechaFin().plusDays(diasTranscurridos));

        // Acumular la cantidad total de días pausados
        int pausaAcumuladaAnterior = (sus.getDiasAcumuladosPausa() != null) ? sus.getDiasAcumuladosPausa() : 0;
        sus.setDiasAcumuladosPausa(pausaAcumuladaAnterior + (int) diasTranscurridos);

        // Limpiar el estado de congelación activo
        sus.setFechaCongelacion(null);
        sus.setMotivoCongelacion(null);
        sus.setEstaCongelada(false);
        suscripcionRepository.save(sus);

        // Actualizar la fecha fin del registro histórico de congelamiento al día de hoy
        congelamientoRepository.findFirstBySuscripcionIdOrderByIdDesc(id).ifPresent(cong -> {
            cong.setFechaFin(hoy);
            congelamientoRepository.save(cong);
        });

        log.info("Suscripción ID {} descongelada exitosamente. Días reales pausados: {}. Nueva fecha de vencimiento: {}",
                id, diasTranscurridos, sus.getFechaFin());
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
