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

                    System.out.println("Sembrado de permisos finalizado con éxito.");
                }

                // Sincronización de permisos por rol SOLO en instalaciones nuevas (count == 0)
                // Se verifica si el Administrador ya tiene permisos asignados antes de sincronizar
                Integer countRolPermiso = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM rol_permiso rp JOIN roles r ON rp.rol_id = r.id WHERE r.nombre = 'ADMINISTRADOR'",
                        Integer.class);

                if (countRolPermiso == null || countRolPermiso == 0) {
                    System.out.println("Sincronizando permisos de roles (primera configuración)...");

                    // 2. Asociar todos los permisos al Administrador
                    jdbcTemplate.execute("INSERT INTO rol_permiso (rol_id, permiso_id) " +
                            "SELECT (SELECT id FROM roles WHERE nombre = 'ADMINISTRADOR' LIMIT 1), id FROM permisos");

                    // 3. Asociar permisos acotados al Recepcionista
                    jdbcTemplate.execute("INSERT INTO rol_permiso (rol_id, permiso_id) " +
                            "SELECT (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA' LIMIT 1), id FROM permisos " +
                            "WHERE codigo IN ('asistencia:ver', 'asistencia:registrar', 'socios:ver', 'socios:crear', " +
                            "'socios:editar', 'membresias:ver', 'productos:ver', 'ventas:ver', " +
                            "'ventas:crear', 'solicitudes:ver', 'solicitudes:aprobar', 'catalogo:ver', " +
                            "'caja:ver', 'caja:operar')");

                    System.out.println("Sincronización de permisos de roles finalizada con éxito.");
                } else {
                    System.out.println("Permisos de roles ya configurados. Saltando sincronización para preservar personalizaciones.");
                }
            } catch (Exception e) {
                System.err.println("Error al sembrar o sincronizar permisos: " + e.getMessage());
            }
        };
    }
}
