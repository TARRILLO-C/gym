package com.gym.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    private final ConcurrentHashMap<String, List<Long>> requestTimesMap = new ConcurrentHashMap<>();

    @Value("${rate.limit.max.requests:5}")
    private int maxRequests;

    @Value("${rate.limit.window.seconds:60}")
    private int windowSeconds;

    /**
     * Intenta adquirir un permiso de petición para una IP específica.
     * Retorna true si está permitido, false si ha excedido el límite.
     */
    public boolean tryAcquire(String ipAddress) {
        long now = System.currentTimeMillis();
        long windowMillis = windowSeconds * 1000L;

        List<Long> times = requestTimesMap.computeIfAbsent(ipAddress, k -> Collections.synchronizedList(new ArrayList<>()));
        synchronized (times) {
            // Eliminar marcas de tiempo fuera de la ventana
            times.removeIf(time -> now - time > windowMillis);
            if (times.size() < maxRequests) {
                times.add(now);
                return true;
            }
            return false;
        }
    }

    /**
     * Limpieza periódica cada 10 minutos para evitar fugas de memoria.
     */
    @Scheduled(fixedDelay = 600000)
    public void cleanup() {
        long now = System.currentTimeMillis();
        long windowMillis = windowSeconds * 1000L;

        requestTimesMap.entrySet().removeIf(entry -> {
            List<Long> times = entry.getValue();
            synchronized (times) {
                times.removeIf(time -> now - time > windowMillis);
                return times.isEmpty();
            }
        });
    }
}
