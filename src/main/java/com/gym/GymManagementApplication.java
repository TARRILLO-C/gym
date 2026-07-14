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
        corregirRelacionRolesUsuarios();
        SpringApplication.run(GymManagementApplication.class, args);
    }

    private static void corregirRelacionRolesUsuarios() {
        String url = "jdbc:mysql://190.116.26.62:3307/gym_db?useSSL=false&serverTimezone=America/Lima&allowPublicKeyRetrieval=true";
        String user = "root";
        String pass = "MUwjL1I5Cpc9dcGfdU";

        try (java.sql.Connection conn = java.sql.DriverManager.getConnection(url, user, pass);
             java.sql.Statement stmt = conn.createStatement()) {
            
            // 1. Crear tabla roles si no existe
            stmt.execute("CREATE TABLE IF NOT EXISTS roles (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "nombre VARCHAR(100) NOT NULL UNIQUE, " +
                    "descripcion VARCHAR(255), " +
                    "activo BOOLEAN NOT NULL, " +
                    "creado_por VARCHAR(50), " +
                    "fecha_creacion DATETIME, " +
                    "modificado_por VARCHAR(50), " +
                    "fecha_modificacion DATETIME" +
                    ") ENGINE=InnoDB");

            // 2. Insertar roles por defecto si no existen
            stmt.execute("INSERT IGNORE INTO roles (nombre, descripcion, activo) VALUES " +
                    "('ADMINISTRADOR', 'Acceso total al sistema', true), " +
                    "('RECEPCIONISTA', 'Acceso operativo del gimnasio', true)");

            // 3. Crear columna rol_id en usuarios si no existe
            try {
                stmt.execute("ALTER TABLE usuarios ADD COLUMN rol_id BIGINT");
            } catch (Exception e) {
                // Ya existe la columna
            }

            // 4. Asignar el rol de ADMINISTRADOR a cualquier usuario que no tenga rol_id asignado o tenga uno inválido
            stmt.execute("UPDATE usuarios SET rol_id = (SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR' LIMIT 1) " +
                    "WHERE rol_id IS NULL OR rol_id NOT IN (SELECT id FROM roles)");

            System.out.println("Esquema relacional roles/usuarios corregido preventivamente de forma exitosa.");
        } catch (Exception e) {
            System.err.println("Advertencia al corregir relación roles/usuarios en base de datos: " + e.getMessage());
        }
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
                jdbcTemplate.execute("DELETE dsp FROM detalle_solicitud_producto dsp JOIN productos p ON dsp.producto_id = p.id WHERE p.nombre LIKE 'Servicio de Membresía%'");
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
            
            // Seeder automático de permisos relacionales si la tabla está vacía
            try {
                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM permisos", Integer.class);
                if (count == null || count == 0) {
                    System.out.println("Iniciando sembrado (seeding) de permisos en la base de datos...");
                    
                    // 1. Insertar permisos
                    jdbcTemplate.execute("INSERT INTO permisos (codigo, nombre, descripcion, modulo) VALUES " +
                            "('dashboard:ver', 'Ver Dashboard', 'Permite visualizar estadísticas generales en el dashboard', 'DASHBOARD'), " +
                            "('socios:ver', 'Ver Socios', 'Permite listar y ver detalles de los socios', 'SOCIOS'), " +
                            "('socios:crear', 'Crear Socios', 'Permite registrar nuevos socios', 'SOCIOS'), " +
                            "('socios:editar', 'Editar Socios', 'Permite actualizar información de socios existentes', 'SOCIOS'), " +
                            "('socios:eliminar', 'Eliminar Socios', 'Permite dar de baja o eliminar socios', 'SOCIOS'), " +
                            "('membresias:ver', 'Ver Membresías', 'Permite visualizar las membresías del catálogo', 'MEMBRESIAS'), " +
                            "('membresias:crear', 'Crear Membresías', 'Permite añadir nuevos tipos de membresías', 'MEMBRESIAS'), " +
                            "('membresias:editar', 'Editar Membresías', 'Permite editar precio o duración de membresías', 'MEMBRESIAS'), " +
                            "('membresias:eliminar', 'Eliminar Membresías', 'Permite desactivar o eliminar membresías del catálogo', 'MEMBRESIAS'), " +
                            "('productos:ver', 'Ver Productos', 'Permite visualizar el inventario de productos', 'PRODUCTOS'), " +
                            "('productos:crear', 'Crear Productos', 'Permite ingresar nuevos productos al inventario', 'PRODUCTOS'), " +
                            "('productos:editar', 'Editar Productos', 'Permite modificar detalles de los productos', 'PRODUCTOS'), " +
                            "('productos:eliminar', 'Eliminar Productos', 'Permite remover productos del catálogo activo', 'PRODUCTOS'), " +
                            "('ventas:ver', 'Ver Ventas', 'Permite listar y auditar ventas realizadas', 'VENTAS'), " +
                            "('ventas:crear', 'Registrar Ventas', 'Permite procesar compras de productos o servicios', 'VENTAS'), " +
                            "('ventas:anular', 'Anular Ventas', 'Permite invalidar una venta (requiere PIN)', 'VENTAS'), " +
                            "('asistencia:ver', 'Ver Control de Acceso', 'Permite ver el historial de accesos', 'ASISTENCIA'), " +
                            "('asistencia:registrar', 'Registrar Asistencias', 'Permite registrar la entrada física de socios', 'ASISTENCIA'), " +
                            "('solicitudes:ver', 'Ver Solicitudes', 'Permite listar las solicitudes pendientes de validación', 'SOLICITUDES'), " +
                            "('solicitudes:aprobar', 'Aprobar Solicitudes', 'Permite aprobar o rechazar comprobantes de pago de socios', 'SOLICITUDES'), " +
                            "('caja:ver', 'Ver Caja', 'Permite acceder al monitor financiero y estado de caja', 'CAJA'), " +
                            "('caja:operar', 'Operar Caja', 'Permite aperturas, egresos, retiros y cierres de turnos', 'CAJA'), " +
                            "('catalogo:ver', 'Ver Configuración del Catálogo', 'Permite visualizar la configuración del catálogo web', 'CATALOGO'), " +
                            "('catalogo:editar', 'Editar Catálogo', 'Permite modificar sliders, imágenes y enlaces del catálogo público', 'CATALOGO'), " +
                            "('personal:ver', 'Ver Personal', 'Permite listar y ver detalles del personal del gimnasio', 'PERSONAL'), " +
                            "('personal:crear', 'Crear Personal', 'Permite dar de alta a nuevos empleados/usuarios', 'PERSONAL'), " +
                            "('personal:editar', 'Editar Personal', 'Permite cambiar roles y datos del personal', 'PERSONAL'), " +
                            "('personal:desactivar', 'Desactivar Personal', 'Permite quitar el acceso a empleados activos', 'PERSONAL'), " +
                            "('inventario:editar', 'Editar Inventario', 'Permite regular stocks y gestionar movimientos de inventario', 'PRODUCTOS')");

                    // 2. Asociar todos los permisos al Administrador (ID: 1)
                    jdbcTemplate.execute("INSERT INTO rol_permiso (rol_id, permiso_id) " +
                            "SELECT (SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR' LIMIT 1), id FROM permisos");

                    // 3. Asociar permisos acotados al Recepcionista (ID: 2)
                    jdbcTemplate.execute("INSERT INTO rol_permiso (rol_id, permiso_id) " +
                            "SELECT (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA' LIMIT 1), id FROM permisos " +
                            "WHERE codigo IN ('asistencia:ver', 'asistencia:registrar', 'socios:ver', 'socios:crear', " +
                            "'socios:editar', 'membresias:ver', 'membresias:crear', 'productos:ver', 'ventas:ver', " +
                            "'ventas:crear', 'solicitudes:ver', 'solicitudes:aprobar', 'catalogo:ver')");
                    
                    System.out.println("Sembrado de permisos finalizado con éxito.");
                }
            } catch (Exception e) {
                System.err.println("Error al sembrar permisos: " + e.getMessage());
            }
        };
    }
}
