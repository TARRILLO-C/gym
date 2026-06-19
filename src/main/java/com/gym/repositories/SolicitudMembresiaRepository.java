package com.gym.repositories;
import com.gym.models.SolicitudMembresia;
import com.gym.models.SolicitudMembresia.EstadoSolicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface SolicitudMembresiaRepository extends JpaRepository<SolicitudMembresia, Long> {
    List<SolicitudMembresia> findByEstado(EstadoSolicitud estado);
    List<SolicitudMembresia> findByEstadoOrderByFechaSolicitudDesc(EstadoSolicitud estado);
    boolean existsByNumeroOperacion(String numeroOperacion);
}