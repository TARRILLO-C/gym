package com.gym.repositories;

import com.gym.models.Congelamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CongelamientoRepository extends JpaRepository<Congelamiento, Long> {
    List<Congelamiento> findBySuscripcionId(Long suscripcionId);
}
