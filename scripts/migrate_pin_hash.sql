-- ============================================================
-- SCRIPT DE MIGRACIÓN: Hashear PINs de administrador con BCrypt
-- ============================================================
-- Ejecutar UNA SOLA VEZ antes de subir a producción con el nuevo código.
-- IMPORTANTE: Reemplaza cada PIN en texto plano por su equivalente BCrypt.
--
-- INSTRUCCIONES:
-- 1. Identifica todos los administradores con PIN configurado.
-- 2. Para cada uno, genera el hash BCrypt del PIN actual y actualiza.
-- 3. Verifica con la consulta final que todos tienen formato $2a$.
--
-- ADVERTENCIA: Si ya corriste este script (los PINs empiezan con $2a$),
-- NO vuelvas a ejecutarlo o los PINs quedarán doble-hasheados.
-- ============================================================

-- PASO 1: Ver estado actual de los PINs
SELECT u.id, u.username, r.nombre as rol,
       CASE 
         WHEN u.pin_admin IS NULL THEN 'SIN PIN'
         WHEN u.pin_admin LIKE '$2%' THEN 'YA HASHEADO (OK)'
         ELSE CONCAT('TEXTO PLANO: ', u.pin_admin)
       END as estado_pin
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
WHERE r.nombre = 'ADMINISTRADOR';

-- ============================================================
-- PASO 2: Actualizar los PINs que están en texto plano.
-- Genera el hash BCrypt para cada PIN conocido.
-- 
-- Cómo generar un hash BCrypt en Java (herramienta rápida):
--   new BCryptPasswordEncoder().encode("TU_PIN_AQUI")
--
-- O usa htpasswd: htpasswd -bnBC 10 "" TU_PIN | tr -d ':\n' | sed 's/$2y/$2a/'
-- O usa https://bcrypt-generator.com/ (solo para pruebas, no en producción)
--
-- EJEMPLOS (reemplaza el hash con el real de tu PIN):
-- ============================================================

-- Ejemplo: Si el admin tiene PIN "1234"
-- UPDATE usuarios SET pin_admin = '$2a$10$HASH_GENERADO_PARA_1234' WHERE username = 'admin';

-- Ejemplo: Si hay otro admin con PIN "9876"
-- UPDATE usuarios SET pin_admin = '$2a$10$HASH_GENERADO_PARA_9876' WHERE username = 'admin2';

-- ============================================================
-- PASO 3: Para PINs desconocidos (nunca configurados o perdidos),
-- puedes limpiarlos y que el admin los configure de nuevo:
-- UPDATE usuarios SET pin_admin = NULL 
-- WHERE pin_admin IS NOT NULL AND pin_admin NOT LIKE '$2%'
--   AND username != 'admin'; -- preserva el admin principal
-- ============================================================

-- PASO 4: Verificación final - todos deben mostrar 'YA HASHEADO (OK)'
SELECT u.id, u.username, r.nombre as rol,
       CASE 
         WHEN u.pin_admin IS NULL THEN 'SIN PIN'
         WHEN u.pin_admin LIKE '$2%' THEN 'YA HASHEADO (OK)'
         ELSE CONCAT('⚠ TEXTO PLANO AÚN: ', u.pin_admin)
       END as estado_pin
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
WHERE r.nombre = 'ADMINISTRADOR';
