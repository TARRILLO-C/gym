package com.gym.repositories;

import com.gym.models.SliderWeb;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SliderWebRepository extends JpaRepository<SliderWeb, Long> {
}
