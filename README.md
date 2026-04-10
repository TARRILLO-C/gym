# Sistema de Gestión de Gimnasio - API REST (gym-management)

Un sistema de gestión de gimnasio basado en una API REST, construido con Java y Spring Boot.

## 🚀 Tecnologías Utilizadas

Este proyecto está construido con las siguientes tecnologías:

*   **Java 21**: Lenguaje de programación principal.
*   **Spring Boot 3.2.5**: Framework principal para el desarrollo de la aplicación.
    *   **Spring Web**: Para la creación de la API REST.
    *   **Spring Data JPA / Hibernate**: Para el acceso y persistencia de datos.
    *   **Spring Boot Validation**: Para la validación de datos de entrada.
*   **MySQL**: Base de datos relacional.
*   **Lombok**: Librería para reducir el código repetitivo (getters, setters, constructores, etc.).
*   **Maven**: Herramienta de gestión de dependencias y construcción del proyecto.

## 📋 Requisitos Previos

Antes de ejecutar el proyecto, asegúrate de tener instalado lo siguiente:

*   [Java Development Kit (JDK) 21](https://www.oracle.com/java/technologies/downloads/#java21)
*   [Apache Maven](https://maven.apache.org/download.cgi)
*   [MySQL Server](https://dev.mysql.com/downloads/mysql/)

## 🛠️ Configuración de la Base de Datos

Puedes ejecutar tu base de datos fácilmente usando **Docker Compose**. El proyecto incluye un archivo `docker-compose.yml` preconfigurado.

1. Asegúrate de tener instalado [Docker](https://www.docker.com/products/docker-desktop).
2. Abre una terminal en la raíz de tu proyecto y ejecuta:

```bash
docker-compose up -d
```

Esto levantará el contenedor de MySQL en el puerto `3306` con la base de datos `gym_db`.

3. Configura tu archivo `src/main/resources/application.properties` con los datos correspondientes:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/gym_db
spring.datasource.username=gym_user
spring.datasource.password=gym_password
spring.jpa.hibernate.ddl-auto=update
```

## ▶️ Cómo Ejecutar el Proyecto

Tienes dos opciones principales para ejecutar la aplicación:

### Opción 1: Usando el plugin de Spring Boot de Maven

Abre una terminal en la raíz del proyecto (donde se encuentra el archivo `pom.xml`) y ejecuta el siguiente comando:

```bash
mvn spring-boot:run
```

### Opción 2: Compilando y ejecutando el archivo JAR

Primero, compila el proyecto y genera el archivo ejecutable (`.jar`):

```bash
mvn clean package
```

Una vez finalizada la construcción, ejecuta el archivo `.jar` generado que se encuentra en la carpeta `target`:

```bash
java -jar target/gym-management-1.0.0.jar
```

## 🌐 Pruebas

Una vez que la aplicación esté en ejecución, el servidor normalmente se iniciará en `http://localhost:8080` (a menos que se haya configurado otro puerto en las propiedades). Puedes usar herramientas como Postman o cURL para interactuar con los endpoints de la API REST.
