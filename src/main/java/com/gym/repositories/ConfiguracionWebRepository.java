package com.gym.repositories;

import com.gym.models.ConfiguracionWeb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionWebRepository extends JpaRepository<ConfiguracionWeb, Long> {
}
