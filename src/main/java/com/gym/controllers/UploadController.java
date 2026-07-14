package com.gym.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import lombok.extern.slf4j.Slf4j;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.FileImageOutputStream;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador seguro para la subida y procesamiento de imágenes del catálogo.
 * Implementa validación real de MIME Type, Magic Numbers, protección contra Path Traversal y compresión automática.
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
            return ResponseEntity.badRequest().body(Map.of("error", "El archivo está vacío"));
        }

        // 1. Validar Content-Type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("Subida rechazada: Content-Type no permitido: {}", contentType);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Solo se permiten archivos de imagen válidos (MIME-Type incorrecto)"));
        }

        // 2. Validar Extensión del archivo original
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
        }

        if (!extension.equals(".jpg") && !extension.equals(".jpeg") && 
            !extension.equals(".png") && !extension.equals(".gif") && 
            !extension.equals(".webp") && !extension.equals(".bmp")) {
            log.warn("Subida rechazada: Extensión no permitida: {}", extension);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Solo se permiten extensiones: .jpg, .jpeg, .png, .gif, .webp, .bmp"));
        }

        // 3. Validar Magic Numbers (Firma real del archivo para evitar inyecciones maliciosas)
        if (!validateMagicNumbers(file)) {
            log.warn("Subida rechazada: Los Magic Numbers del archivo no coinciden con una firma de imagen válida.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "El contenido del archivo no corresponde a una firma de imagen válida (Spoofing detectado)"));
        }

        try {
            // Asegurarnos que la carpeta existe localmente
            File directory = new File(UPLOAD_DIR);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // 4. Renombrar usando UUID libre de Path Traversal
            String newFileName = "img_" + UUID.randomUUID().toString().replace("-", "") + extension;
            
            // 5. Blindar contra Path Traversal resolviendo y normalizando la ruta destino
            Path uploadPath = Paths.get(UPLOAD_DIR).toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(newFileName).normalize();
            
            if (!filePath.startsWith(uploadPath)) {
                log.error("Alerta de seguridad: Intento de Path Traversal detectado con el nombre: {}", newFileName);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Intento de Path Traversal bloqueado por el servidor"));
            }

            // 6. Guardar físico aplicando compresión y optimización
            saveAndCompressImage(file, filePath, extension);

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
            log.error("Error crítico al guardar imagen en servidor: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Error interno al procesar el archivo en el servidor"));
        }
    }

    /**
     * Valida la firma del archivo leyendo los primeros bytes para confirmar que sea una imagen real.
     */
    private boolean validateMagicNumbers(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] headerBytes = new byte[12];
            int bytesRead = is.read(headerBytes);
            if (bytesRead < 4) {
                return false;
            }
            
            // JPG/JPEG (FF D8 FF)
            if ((headerBytes[0] & 0xFF) == 0xFF && (headerBytes[1] & 0xFF) == 0xD8 && (headerBytes[2] & 0xFF) == 0xFF) {
                return true;
            }
            
            // PNG (89 50 4E 47)
            if ((headerBytes[0] & 0xFF) == 0x89 && (headerBytes[1] & 0xFF) == 0x50 && (headerBytes[2] & 0xFF) == 0x4E && (headerBytes[3] & 0xFF) == 0x47) {
                return true;
            }
            
            // GIF (47 49 46 38)
            if ((headerBytes[0] & 0xFF) == 0x47 && (headerBytes[1] & 0xFF) == 0x49 && (headerBytes[2] & 0xFF) == 0x46 && (headerBytes[3] & 0xFF) == 0x38) {
                return true;
            }
            
            // BMP (42 4D)
            if ((headerBytes[0] & 0xFF) == 0x42 && (headerBytes[1] & 0xFF) == 0x4D) {
                return true;
            }
            
            // WEBP ("RIFF" en 0-3 y "WEBP" en 8-11)
            if (bytesRead >= 12) {
                if ((headerBytes[0] & 0xFF) == 0x52 && (headerBytes[1] & 0xFF) == 0x49 && (headerBytes[2] & 0xFF) == 0x46 && (headerBytes[3] & 0xFF) == 0x46 &&
                    (headerBytes[8] & 0xFF) == 0x57 && (headerBytes[9] & 0xFF) == 0x45 && (headerBytes[10] & 0xFF) == 0x42 && (headerBytes[11] & 0xFF) == 0x50) {
                    return true;
                }
            }
        } catch (IOException e) {
            log.error("Error leyendo bytes de cabecera de archivo: ", e);
        }
        return false;
    }

    /**
     * Redimensiona y comprime la imagen para optimizar el almacenamiento.
     */
    private void saveAndCompressImage(MultipartFile file, Path targetPath, String extension) throws IOException {
        try (InputStream is = file.getInputStream()) {
            BufferedImage originalImage = ImageIO.read(is);
            if (originalImage == null) {
                Files.write(targetPath, file.getBytes());
                return;
            }

            int type = originalImage.getType() == 0 ? BufferedImage.TYPE_INT_ARGB : originalImage.getType();
            
            // Redimensionar si excede los 1200px
            int maxDimension = 1200;
            int newWidth = originalImage.getWidth();
            int newHeight = originalImage.getHeight();
            boolean needResize = false;

            if (newWidth > maxDimension || newHeight > maxDimension) {
                needResize = true;
                if (newWidth > newHeight) {
                    newHeight = (int) (((double) newHeight / newWidth) * maxDimension);
                    newWidth = maxDimension;
                } else {
                    newWidth = (int) (((double) newWidth / newHeight) * maxDimension);
                    newHeight = maxDimension;
                }
            }

            BufferedImage resizedImage = originalImage;
            if (needResize) {
                resizedImage = new BufferedImage(newWidth, newHeight, type);
                Graphics2D g = resizedImage.createGraphics();
                g.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
                g.dispose();
            }

            // Comprimir si es JPEG
            if (extension.equalsIgnoreCase(".jpg") || extension.equalsIgnoreCase(".jpeg")) {
                Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
                if (writers.hasNext()) {
                    ImageWriter writer = writers.next();
                    ImageWriteParam param = writer.getDefaultWriteParam();
                    if (param.canWriteCompressed()) {
                        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                        param.setCompressionQuality(0.75f);
                    }
                    File outputFile = targetPath.toFile();
                    try (FileImageOutputStream output = new FileImageOutputStream(outputFile)) {
                        writer.setOutput(output);
                        IIOImage iioImage = new IIOImage(resizedImage, null, null);
                        writer.write(null, iioImage, param);
                    } finally {
                        writer.dispose();
                    }
                    return;
                }
            }

            String formatName = extension.substring(1);
            boolean written = ImageIO.write(resizedImage, formatName, targetPath.toFile());
            if (!written) {
                ImageIO.write(resizedImage, "jpeg", targetPath.toFile());
            }
        } catch (Exception e) {
            log.warn("Fallo en la compresión/redimensionado. Guardando archivo original. Detalle: {}", e.getMessage());
            Files.write(targetPath, file.getBytes());
        }
    }
}
