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
        };
    }
}
