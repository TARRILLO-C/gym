package com.gym.services;

import com.gym.exceptions.DuplicateResourceException;
import com.gym.exceptions.ResourceNotFoundException;
import com.gym.models.Socio;
import com.gym.models.Socio.EstadoSocio;
import com.gym.repositories.SocioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Servicio de negocio para la entidad {@link Socio}.
 * Encapsula las reglas de negocio relacionadas con socios del gimnasio.
 */
@Service
@RequiredArgsConstructor   // inyección por constructor (sin @Autowired)
@Slf4j
public class SocioService {

    private final SocioRepository socioRepository;

    // ── Consultas ─────────────────────────────────────────────────────────────

    /**
     * Retorna todos los socios registrados.
     */
    @Transactional(readOnly = true)
    public List<Socio> listarTodos() {
        log.debug("Listando todos los socios");
        return socioRepository.findAll();
    }

    /**
     * Retorna un socio por su ID.
     *
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public Socio buscarPorId(Long id) {
        return socioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Socio", id));
    }

    /**
     * Retorna un socio por su DNI.
     *
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public Socio buscarPorDni(String dni) {
        return socioRepository.findByDni(dni)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Socio con DNI " + dni + " no fue encontrado."));
    }

    /**
     * Retorna todos los socios con un estado específico (ACTIVO / INACTIVO).
     */
    @Transactional(readOnly = true)
    public List<Socio> listarPorEstado(EstadoSocio estado) {
        return socioRepository.findByEstado(estado);
    }

    /**
     * Busca socios cuyo nombre contenga el texto dado.
     */
    @Transactional(readOnly = true)
    public List<Socio> buscarPorNombre(String nombre) {
        return socioRepository.findByNombreCompletoContainingIgnoreCase(nombre);
    }

    /**
     * Busca socios cuyo nombre o DNI contenga el texto dado.
     */
    @Transactional(readOnly = true)
    public List<Socio> buscarPorQuery(String query) {
        log.debug("Buscando socios con query: {}", query);
        return socioRepository.findByNombreCompletoContainingIgnoreCaseOrDniContaining(query, query);
    }

    // ── Comandos ──────────────────────────────────────────────────────────────

    /**
     * Registra un nuevo socio.
     * Verifica que el DNI no esté duplicado antes de guardar.
     *
     * @throws DuplicateResourceException si el DNI ya está registrado
     */
    @Transactional
    public Socio registrar(Socio socio) {
        normalizarDatos(socio);
        if (socioRepository.existsByDni(socio.getDni())) {
            throw new DuplicateResourceException("Ya existe un socio con DNI: " + socio.getDni());
        }
        if (socio.getRuc() != null && !socio.getRuc().trim().isEmpty() && socioRepository.existsByRuc(socio.getRuc())) {
            throw new DuplicateResourceException("Ya existe un socio con RUC: " + socio.getRuc());
        }
        // Por defecto, un nuevo socio inicia como ACTIVO
        if (socio.getEstado() == null) {
            socio.setEstado(EstadoSocio.ACTIVO);
        }
        Socio guardado = socioRepository.save(socio);
        log.info("Socio registrado: {} (DNI: {})", guardado.getNombreCompleto(), guardado.getDni());
        return guardado;
    }

    /**
     * Actualiza los datos de un socio existente.
     *
     * @throws ResourceNotFoundException  si el socio no existe
     * @throws DuplicateResourceException si el nuevo DNI ya pertenece a otro socio
     */
    @Transactional
    public Socio actualizar(Long id, Socio datosNuevos) {
        normalizarDatos(datosNuevos);
        Socio existente = buscarPorId(id);

        // Verificar DNI duplicado
        if (!existente.getDni().equals(datosNuevos.getDni()) && socioRepository.existsByDni(datosNuevos.getDni())) {
            throw new DuplicateResourceException("El DNI " + datosNuevos.getDni() + " ya pertenece a otro socio.");
        }
        
        // Verificar RUC duplicado
        if (datosNuevos.getRuc() != null && !datosNuevos.getRuc().trim().isEmpty()) {
            if ((existente.getRuc() == null || !existente.getRuc().equals(datosNuevos.getRuc())) && socioRepository.existsByRuc(datosNuevos.getRuc())) {
                throw new DuplicateResourceException("El RUC " + datosNuevos.getRuc() + " ya pertenece a otro socio.");
            }
        }

        existente.setNombreCompleto(datosNuevos.getNombreCompleto());
        existente.setDni(datosNuevos.getDni());
        existente.setRuc(datosNuevos.getRuc());
        existente.setRazonSocial(datosNuevos.getRazonSocial());
        existente.setTelefono(datosNuevos.getTelefono());
        existente.setEmail(datosNuevos.getEmail());
        existente.setFechaNacimiento(datosNuevos.getFechaNacimiento());
        existente.setEstado(datosNuevos.getEstado());
        existente.setFaceDescriptor(datosNuevos.getFaceDescriptor());

        log.info("Socio ID {} actualizado.", id);
        return socioRepository.save(existente);
    }

    /**
     * Elimina un socio por su ID.
     *
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public void eliminar(Long id) {
        Socio socio = buscarPorId(id);
        socio.setEstado(EstadoSocio.INACTIVO);
        socioRepository.save(socio);
        log.info("Socio ID {} pasado a estado INACTIVO (borrado lógico).", id);
    }

    /**
     * Cambia el estado de un socio (ACTIVO ↔ INACTIVO).
     * Útil para deshabilitar socios sin borrarlos.
     */
    @Transactional
    public Socio cambiarEstado(Long id, EstadoSocio nuevoEstado) {
        Socio socio = buscarPorId(id);
        socio.setEstado(nuevoEstado);
        log.info("Socio ID {} → estado cambiado a {}", id, nuevoEstado);
        return socioRepository.save(socio);
    }

    /**
     * Normaliza los datos del socio:
     * - Trimea campos de texto.
     * - Convierte cadenas vacías en campos opcionales únicos (RUC, Email) a null.
     */
    private void normalizarDatos(Socio socio) {
        if (socio.getNombreCompleto() != null) {
            socio.setNombreCompleto(socio.getNombreCompleto().trim());
        }
        if (socio.getDni() != null) {
            socio.setDni(socio.getDni().trim());
        }
        
        // Manejo de RUC: si está vacío o solo tiene espacios, convertir a null
        if (socio.getRuc() != null) {
            String rucTrim = socio.getRuc().trim();
            socio.setRuc(rucTrim.isEmpty() ? null : rucTrim);
        }

        // Manejo de Email: si está vacío o solo tiene espacios, convertir a null
        if (socio.getEmail() != null) {
            String emailTrim = socio.getEmail().trim();
            socio.setEmail(emailTrim.isEmpty() ? null : emailTrim);
        }

        if (socio.getTelefono() != null) {
            socio.setTelefono(socio.getTelefono().trim());
        }
        
        if (socio.getRazonSocial() != null) {
            socio.setRazonSocial(socio.getRazonSocial().trim());
        }
    }
}
