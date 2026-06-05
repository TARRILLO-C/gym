# Guía de Despliegue en Railway 🚀

Esta guía contiene todos los pasos necesarios para desplegar el proyecto **The Jungle Gym** en **Railway**. El proyecto cuenta con un backend en **Spring Boot (Java 21)**, un frontend en **React (Vite)** y una base de datos **MySQL**.

---

## 1. Cambios Previos Realizados en el Código
Para asegurar un despliegue exitoso sin errores de red o puertos, ya hemos actualizado los siguientes archivos en tu código local:

*   **`application.properties`**: Cambiamos la configuración del puerto de `SERVER_PORT` a `PORT` (`server.port=${PORT:8080}`), que es la variable de entorno que Railway asigna de forma automática para exponer la aplicación.
*   **`UploadController.java`**: Cambiamos la URL de retorno del archivo subido. En vez de estar harcodeada a `http://localhost:8080`, ahora detecta dinámicamente la URL real de producción utilizando la información de la cabecera HTTP de la solicitud (`HttpServletRequest`).
*   **Frontend (`api.js`, `Login.jsx`, `CatalogoVirtual.jsx`, `ConfiguracionCatalogo.jsx`)**: Reemplazamos todos los endpoints fijos de `http://localhost:8080/api` por una variable dinámica de entorno en Vite: `import.meta.env.VITE_API_URL` con un fallback por defecto a localhost en caso de desarrollo.

> **Importante:** Recuerda subir estos cambios a tu repositorio de GitHub antes de iniciar el despliegue (`git add .`, `git commit -m "preparar despliegue railway"`, `git push origin main`).

---

## 2. Paso 1: Crear Base de Datos MySQL en Railway
Spring Boot necesita una base de datos MySQL activa para guardar los datos.

1.  Ve a [Railway.app](https://railway.app/) e inicia sesión.
2.  Haz clic en **New Project** (Nuevo proyecto).
3.  Selecciona **Provision MySQL** (Aprovisionar MySQL).
4.  Railway creará una base de datos vacía. Espera unos segundos a que el estado cambie a activo.
5.  Haz clic en el cuadro de la base de datos MySQL recién creada, ve a la pestaña **Variables** o **Connect** y copia la URL de conexión o las credenciales individuales. Las necesitarás en el siguiente paso.

---

## 3. Paso 2: Desplegar el Backend (Spring Boot)
1.  En tu proyecto de Railway, haz clic en **New** (o el botón `+` en la interfaz) y selecciona **Github Repo**.
2.  Si es tu primera vez, dale permisos a Railway para acceder a tus repositorios y selecciona el repositorio de tu proyecto (`gym`).
3.  Una vez seleccionado el repositorio, Railway creará un nuevo servicio para el backend.
4.  Haz clic en el nuevo servicio del backend y ve a la sección **Settings** (Configuración):
    *   **Root Directory**: Asegúrate de que esté configurado como `/` (la raíz de tu repositorio).
5.  Ve a la pestaña **Variables** del backend y agrega las siguientes variables de entorno:

| Variable | Valor / Referencia | Descripción |
| :--- | :--- | :--- |
| `PORT` | `8080` | Puerto en el que escuchará el contenedor. |
| `DB_URL` | `jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?useSSL=false&serverTimezone=America/Lima&allowPublicKeyRetrieval=true` | Conecta de manera automática con tu servicio MySQL en Railway. |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` | Referencia al usuario autogenerado de tu base de datos MySQL. |
| `DB_PASS` | `${{MySQL.MYSQLPASSWORD}}` | Referencia a la contraseña autogenerada de tu base de datos MySQL. |
| `NIXPACKS_JDK_VERSION` | `21` | Asegura que Railway use Java 21 para compilar el código. |

6.  Una vez guardadas las variables, Railway iniciará la compilación automáticamente.
7.  Ve a la pestaña **Settings** (Configuración) de tu servicio backend, busca la sección **Networking** y haz clic en **Generate Domain** para crear una URL pública (ejemplo: `https://gym-production-xxxx.up.railway.app`). **Guarda esta URL ya que la usaremos para conectar el frontend**.

> **Nota:** Al iniciar el backend por primera vez con las credenciales de base de datos correctas, Spring Boot creará de forma automática todas las tablas necesarias y cargará los datos iniciales (categorías y los usuarios por defecto `admin/admin` y `recepcion/recepcion`).

---

## 4. Paso 3: Persistencia de Imágenes (Montar un Volumen)
Debido a que los contenedores de Railway son efímeros (se borran y recrean en cada actualización o reinicio), las imágenes que subas en el Catálogo Virtual se perderán a menos que use las unidades de almacenamiento persistente de Railway (Volumes).

1.  En el panel de control de tu proyecto en Railway, ve a tu servicio backend.
2.  Ve a la pestaña **Settings** (Configuración) y baja hasta la sección **Volumes**.
3.  Haz clic en **Add Volume** (Añadir volumen).
4.  Configura el volumen con las siguientes especificaciones:
    *   **Name**: `uploads_volume`
    *   **Mount Path**: `/app/uploads` (este es el directorio dentro del contenedor donde se ejecuta la app y donde nuestro backend escribe las imágenes).
5.  Haz clic en **Save** (Guardar) para reiniciar el contenedor y montar el volumen. ¡Ahora tus imágenes subidas estarán seguras en cada reinicio!

---

## 5. Paso 4: Desplegar el Frontend (React/Vite)

Tienes dos opciones principales para desplegar tu frontend. La opción 1 es la más recomendada porque es 100% gratuita y ahorra tus recursos de Railway.

### Opción A: Desplegar en Vercel (Recomendado y Gratis)
Vercel es excelente para alojar aplicaciones estáticas (HTML/React) y es gratis de forma ilimitada para proyectos personales.

1.  Ve a [Vercel.com](https://vercel.com/) y regístrate o inicia sesión con tu cuenta de GitHub.
2.  Haz clic en **Add New** > **Project**.
3.  Selecciona tu repositorio de GitHub `gym`.
4.  En la configuración del proyecto:
    *   **Framework Preset**: Selecciona `Vite`.
    *   **Root Directory**: Cambia la raíz haciendo clic en `Edit` y selecciona la carpeta `frontend`.
    *   **Environment Variables**: Añade una nueva variable:
        *   **Name**: `VITE_API_URL`
        *   **Value**: La URL pública de tu backend en Railway más la ruta `/api` (ejemplo: `https://gym-production-xxxx.up.railway.app/api`).
5.  Haz clic en **Deploy**. ¡Listo! Vercel compilará tu frontend y te proporcionará una URL pública.

---

### Opción B: Desplegar en Railway (Como un servicio adicional)
Si prefieres tener todo centralizado en la misma plataforma:

1.  En tu proyecto de Railway, haz clic en **New** > **Github Repo** y vuelve a seleccionar el repositorio de tu proyecto `gym`. Esto creará un segundo servicio.
2.  Renombra este servicio a `gym-frontend` para diferenciarlo del backend.
3.  Haz clic en el servicio frontend, ve a **Settings** y configura:
    *   **Root Directory**: `/frontend` (la carpeta donde se encuentra tu frontend).
    *   **Build Command**: `npm run build`
    *   **Start Command**: `npx serve -s dist -l $PORT` (esto sirve el build de producción de React).
4.  Ve a la pestaña **Variables** del frontend y añade la siguiente variable:
    *   `VITE_API_URL` = La URL pública de tu backend en Railway más la ruta `/api` (ejemplo: `https://gym-production-xxxx.up.railway.app/api`).
5.  Ve a la sección **Settings** > **Networking** y haz clic en **Generate Domain** para crear la URL pública de tu frontend.
6.  Railway compilará y levantará el frontend de forma automática.

---

## ¡Despliegue Completado! 🎉
Una vez realizados estos pasos:
*   Tu base de datos almacenará la información del gimnasio.
*   Tu API procesará los registros, asistencias y ventas.
*   Tu frontend permitirá a los socios registrarse, ver el catálogo y al administrador configurar la plataforma utilizando la URL pública generada.
*   Podrás ingresar a la administración con el usuario `admin` y la contraseña `admin`.
