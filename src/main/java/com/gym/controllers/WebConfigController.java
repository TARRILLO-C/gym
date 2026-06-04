package com.gym.controllers;

import com.gym.models.ConfiguracionWeb;
import com.gym.models.SliderWeb;
import com.gym.repositories.ConfiguracionWebRepository;
import com.gym.repositories.SliderWebRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/web-config")
public class WebConfigController {

    @Autowired
    private ConfiguracionWebRepository configuracionWebRepository;

    @Autowired
    private SliderWebRepository sliderWebRepository;

    // ----- CONFIGURACIÓN WEB (LOGO, ETC) -----

    @GetMapping
    public ResponseEntity<ConfiguracionWeb> getConfiguracion() {
        List<ConfiguracionWeb> configs = configuracionWebRepository.findAll();
        if (configs.isEmpty()) {
            ConfiguracionWeb newConfig = new ConfiguracionWeb();
            newConfig.setLogoUrl("");
            return ResponseEntity.ok(configuracionWebRepository.save(newConfig));
        }
        return ResponseEntity.ok(configs.get(0));
    }

    @PutMapping
    public ResponseEntity<ConfiguracionWeb> updateConfiguracion(@RequestBody ConfiguracionWeb configData) {
        List<ConfiguracionWeb> configs = configuracionWebRepository.findAll();
        ConfiguracionWeb configToUpdate;
        if (configs.isEmpty()) {
            configToUpdate = new ConfiguracionWeb();
        } else {
            configToUpdate = configs.get(0);
        }
        configToUpdate.setLogoUrl(configData.getLogoUrl());
        configToUpdate.setYapeNumber(configData.getYapeNumber());
        configToUpdate.setYapeTitular(configData.getYapeTitular());
        configToUpdate.setNumeroCuenta(configData.getNumeroCuenta());
        configToUpdate.setCuentaTitular(configData.getCuentaTitular());
        return ResponseEntity.ok(configuracionWebRepository.save(configToUpdate));
    }

    // ----- SLIDER WEB -----

    @GetMapping("/slider")
    public ResponseEntity<List<SliderWeb>> getSliders() {
        return ResponseEntity.ok(sliderWebRepository.findAll());
    }

    @PostMapping("/slider")
    public ResponseEntity<SliderWeb> addSlider(@RequestBody SliderWeb sliderWeb) {
        return ResponseEntity.ok(sliderWebRepository.save(sliderWeb));
    }

    @DeleteMapping("/slider/{id}")
    public ResponseEntity<?> deleteSlider(@PathVariable Long id) {
        if (!sliderWebRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        sliderWebRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
