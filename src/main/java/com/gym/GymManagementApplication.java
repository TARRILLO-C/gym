package com.gym;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GymManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(GymManagementApplication.class, args);
    }

    @Bean
    public CommandLineRunner updateDatabaseSchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE solicitudes_producto MODIFY COLUMN estado ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ENTREGADO') NOT NULL");
                System.out.println("Esquema de base de datos actualizado con éxito: se agregó ENTREGADO a solicitudes_producto.estado");
            } catch (Exception e) {
                System.err.println("Error al actualizar esquema: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("DELETE dsp FROM detalle_solicitud_producto dsp JOIN producto p ON dsp.producto_id = p.id WHERE p.nombre LIKE 'Servicio de Membresía%'");
                jdbcTemplate.execute("DELETE sp FROM solicitudes_producto sp LEFT JOIN detalle_solicitud_producto dsp ON dsp.solicitud_producto_id = sp.id WHERE dsp.id IS NULL");
                System.out.println("Limpieza de solicitudes de membresía en tabla de productos realizada con éxito.");
            } catch (Exception e) {
                System.err.println("Error al limpiar solicitudes de membresía de la tabla de productos: " + e.getMessage());
            }
        };
    }
}
