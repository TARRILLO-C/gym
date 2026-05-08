package com.gym.services;

import com.gym.models.Suscripcion;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${gym.mail.from:gimnasio@prueba.com}")
    private String fromEmail;

    @Async
    public void enviarAlertaVencimiento(Suscripcion suscripcion) {
        String emailTo = suscripcion.getSocio().getEmail();
        if (emailTo == null || emailTo.isEmpty()) {
            log.warn("El socio {} no tiene correo registrado. Se omite alerta de vencimiento.", suscripcion.getSocio().getNombreCompleto());
            return;
        }

        String subject = "¡Tu plan de gimnasio está por vencer!";
        String content = construirHtmlAlerta(suscripcion);

        enviarCorreo(emailTo, subject, content);
    }

    @Async
    public void enviarConfirmacionCompra(Suscripcion suscripcion) {
        String emailTo = suscripcion.getSocio().getEmail();
        if (emailTo == null || emailTo.isEmpty()) {
            log.warn("El socio {} no tiene correo registrado. Se omite confirmación de compra.", suscripcion.getSocio().getNombreCompleto());
            return;
        }

        String subject = "¡Confirmación de compra de tu plan - Bienvenido!";
        String content = construirHtmlCompra(suscripcion);

        enviarCorreo(emailTo, subject, content);
    }

    private void enviarCorreo(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, "Gimnasio System");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true indica que es HTML
            
            mailSender.send(message);
            log.info("Correo enviado exitosamente a: {}", to);
        } catch (Exception e) {
            log.error("Error enviando correo a {}: {}", to, e.getMessage());
        }
    }

    private String construirHtmlAlerta(Suscripcion sus) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String fechaFin = sus.getFechaFin().format(dtf);
        String nombre = sus.getSocio().getNombreCompleto();
        String plan = sus.getMembresia().getNombre();

        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>" +
                "<h2 style='color: #d9534f; text-align: center;'>¡Aviso de Vencimiento!</h2>" +
                "<p>Hola <strong>" + nombre + "</strong>,</p>" +
                "<p>Te escribimos para recordarte que tu plan <strong>" + plan + "</strong> vencerá en 2 días, el <strong>" + fechaFin + "</strong>.</p>" +
                "<p>¡No pierdas el ritmo! Acércate a recepción para renovar tu membresía y seguir entrenando con nosotros.</p>" +
                "<br>" +
                "<p>Saludos cordiales,<br><strong>El equipo del Gimnasio</strong></p>" +
                "</div>";
    }

    private String construirHtmlCompra(Suscripcion sus) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String fechaInicio = sus.getFechaInicio() != null ? sus.getFechaInicio().format(dtf) : "Hoy";
        String fechaFin = sus.getFechaFin().format(dtf);
        String nombre = sus.getSocio().getNombreCompleto();
        String plan = sus.getMembresia().getNombre();
        String precio = sus.getMembresia().getPrecioCuota() != null ? "S/ " + sus.getMembresia().getPrecioCuota() : "Consulta en recepción";
        String detalles = sus.getMembresia().getDescripcion() != null ? sus.getMembresia().getDescripcion() : "Acceso a las instalaciones.";

        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>" +
                "<h2 style='color: #5cb85c; text-align: center;'>¡Gracias por tu compra!</h2>" +
                "<p>Hola <strong>" + nombre + "</strong>,</p>" +
                "<p>Hemos registrado exitosamente tu suscripción al plan <strong>" + plan + "</strong>.</p>" +
                "<h3>Detalles de tu membresía:</h3>" +
                "<ul>" +
                "<li><strong>Costo:</strong> " + precio + "</li>" +
                "<li><strong>Fecha de Inicio:</strong> " + fechaInicio + "</li>" +
                "<li><strong>Fecha de Vencimiento:</strong> " + fechaFin + "</li>" +
                "<li><strong>Incluye:</strong> " + detalles + "</li>" +
                "</ul>" +
                "<p>¡Te esperamos para entrenar con todo!</p>" +
                "<br>" +
                "<p>Saludos cordiales,<br><strong>El equipo del Gimnasio</strong></p>" +
                "</div>";
    }
}
