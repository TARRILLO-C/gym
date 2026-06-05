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
        System.out.println("=== SYSTEM ENV DEBUG ===");
        System.out.println("DB_USER: " + System.getenv("DB_USER"));
        System.out.println("DB_PASS length: " + (System.getenv("DB_PASS") != null ? System.getenv("DB_PASS").length() : "null"));
        System.out.println("MYSQLPASSWORD length: " + (System.getenv("MYSQLPASSWORD") != null ? System.getenv("MYSQLPASSWORD").length() : "null"));
        System.out.println("DB_URL: " + System.getenv("DB_URL"));
        System.out.println("========================");
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
            try {
                java.util.List<String> indexNames = jdbcTemplate.query(
                        "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'socios' AND COLUMN_NAME = 'email'",
                        (rs, rowNum) -> rs.getString("INDEX_NAME")
                );
                for (String indexName : indexNames) {
                    if (!"PRIMARY".equalsIgnoreCase(indexName)) {
                        jdbcTemplate.execute("ALTER TABLE socios DROP INDEX " + indexName);
                        System.out.println("Índice único '" + indexName + "' eliminado de la tabla socios.");
                    }
                }
            } catch (Exception e) {
                System.err.println("No se pudo eliminar dinámicamente el índice de email: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("UPDATE productos SET stock_minimo = 5 WHERE stock_minimo IS NULL");
                System.out.println("Actualizado stock_minimo por defecto para productos preexistentes.");
            } catch (Exception e) {
                // Columna aún no creada por Hibernate
            }
        };
    }
}
