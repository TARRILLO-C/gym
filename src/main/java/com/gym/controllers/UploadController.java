package com.gym.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador de subida de archivos e imagenes (Reemplaza Appwrite)
 */
@RestController
@RequestMapping("/upload")
@Slf4j
public class UploadController {

    private static final String UPLOAD_DIR = "uploads/";

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            jakarta.servlet.http.HttpServletRequest request
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            // Asegurarnos que la carpeta existe localmente
            File directory = new File(UPLOAD_DIR);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // Nombre único universal
            String originalName = file.getOriginalFilename();
            String extension = originalName != null && originalName.contains(".") 
                    ? originalName.substring(originalName.lastIndexOf(".")) : ".png";
            String newFileName = "img_" + UUID.randomUUID().toString().replace("-", "") + extension;
            
            // Guardar físico
            Path filePath = Paths.get(UPLOAD_DIR + newFileName);
            Files.write(filePath, file.getBytes());

            // Devolver la URL pública dinámicamente
            String scheme = request.getScheme();             // http o https
            String serverName = request.getServerName();     // e.g. localhost o gym-production.up.railway.app
            int serverPort = request.getServerPort();        // e.g. 8080 o 80 o 443
            
            StringBuilder baseUrl = new StringBuilder();
            baseUrl.append(scheme).append("://").append(serverName);
            
            if (("http".equals(scheme) && serverPort != 80) || ("https".equals(scheme) && serverPort != 443)) {
                baseUrl.append(":").append(serverPort);
            }
            
            String fileUrl = baseUrl.toString() + "/api/uploads/" + newFileName;
            
            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            log.error("Error crítico al subir imagen localmente: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
