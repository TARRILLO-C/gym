package com.gym.services;

import com.gym.models.*;
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
        enviarConfirmacionCompra(suscripcion, null);
    }

    @Async
    public void enviarConfirmacionCompra(Suscripcion suscripcion, String numeroOperacion) {
        String emailTo = suscripcion.getSocio().getEmail();
        if (emailTo == null || emailTo.isEmpty()) {
            log.warn("El socio {} no tiene correo registrado. Se omite confirmación de compra.", suscripcion.getSocio().getNombreCompleto());
            return;
        }

        String subject = "¡Confirmación de tu Membresía - The Jungle Gym!";
        String content = construirHtmlCompra(suscripcion, numeroOperacion);

        enviarCorreo(emailTo, subject, content);
    }

    @Async
    public void enviarConfirmacionVenta(SolicitudProducto solicitud) {
        String emailTo = solicitud.getEmail();
        if (emailTo == null || emailTo.isEmpty()) {
            log.warn("La solicitud de venta {} no tiene correo registrado. Se omite envío de correo.", solicitud.getNombreCompleto());
            return;
        }

        String subject = "¡Tu pedido está listo para recoger! - Código SOL-" + solicitud.getId();
        String content = construirHtmlConfirmacionVenta(solicitud);

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
        return construirHtmlCompra(sus, null);
    }

    private String construirHtmlCompra(Suscripcion sus, String numeroOperacion) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String fechaInicio = sus.getFechaInicio() != null ? sus.getFechaInicio().format(dtf) : "Hoy";
        String fechaFin    = sus.getFechaFin().format(dtf);
        String nombre      = sus.getSocio().getNombreCompleto();
        String dni         = sus.getSocio().getDni() != null ? sus.getSocio().getDni() : "-";
        String plan        = sus.getMembresia().getNombre();
        String duracion    = sus.getMembresia().getDuracionDias() + " días";
        String precio      = sus.getMembresia().getPrecio() != null
                             ? "S/ " + sus.getMembresia().getPrecio().setScale(2, java.math.RoundingMode.HALF_UP)
                             : "Consultar en recepción";
        String descripcion = (sus.getMembresia().getDescripcion() != null && !sus.getMembresia().getDescripcion().isBlank())
                             ? sus.getMembresia().getDescripcion()
                             : "Acceso a todas las instalaciones del gimnasio.";
        String numOp       = (numeroOperacion != null && !numeroOperacion.isBlank()) ? numeroOperacion : "—";

        return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body>" +
            "<div style='font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #f4f4f4; padding: 20px; border-radius: 12px;'>" +

            // Header
            "<div style='background: linear-gradient(135deg, #1a1a2e 0%, #e94560 100%); padding: 30px 20px; border-radius: 10px 10px 0 0; text-align: center;'>" +
            "  <h1 style='color: white; margin: 0; font-size: 1.6rem; letter-spacing: 1px;'>🏋️ The Jungle Gym</h1>" +
            "  <p style='color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 1rem;'>Confirmación de Membresía</p>" +
            "</div>" +

            // Cuerpo
            "<div style='background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;'>" +
            "  <p style='font-size: 1rem; color: #333;'>Hola <strong>" + nombre + "</strong>,</p>" +
            "  <p style='color: #555;'>Tu membresía ha sido <strong style='color: #22c55e;'>✔ aprobada y activada</strong> exitosamente. Aquí están todos los detalles de tu compra:</p>" +

            // Recuadro de resumen
            "  <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;'>" +
            "    <h3 style='margin: 0 0 15px 0; color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 8px;'>📋 Detalle de tu Plan</h3>" +
            "    <table style='width: 100%; border-collapse: collapse; font-size: 0.95rem;'>" +
            "      <tr><td style='padding: 8px 0; color: #64748b; width: 45%;'>Plan contratado</td>" +
            "          <td style='padding: 8px 0; font-weight: bold; color: #1a1a2e;'>" + plan + "</td></tr>" +
            "      <tr style='background:#f1f5f9;'><td style='padding: 8px 5px; color: #64748b;'>Duración</td>" +
            "          <td style='padding: 8px 5px; font-weight: bold;'>" + duracion + "</td></tr>" +
            "      <tr><td style='padding: 8px 0; color: #64748b;'>Precio pagado</td>" +
            "          <td style='padding: 8px 0; font-weight: bold; color: #e94560; font-size: 1.1rem;'>" + precio + "</td></tr>" +
            "      <tr style='background:#f1f5f9;'><td style='padding: 8px 5px; color: #64748b;'>Fecha de inicio</td>" +
            "          <td style='padding: 8px 5px; font-weight: bold;'>" + fechaInicio + "</td></tr>" +
            "      <tr><td style='padding: 8px 0; color: #64748b;'>Fecha de vencimiento</td>" +
            "          <td style='padding: 8px 0; font-weight: bold;'>" + fechaFin + "</td></tr>" +
            "      <tr style='background:#f1f5f9;'><td style='padding: 8px 5px; color: #64748b;'>DNI</td>" +
            "          <td style='padding: 8px 5px;'>" + dni + "</td></tr>" +
            "      <tr><td style='padding: 8px 0; color: #64748b;'>N° de operación</td>" +
            "          <td style='padding: 8px 0; font-family: monospace; color: #1e40af;'>" + numOp + "</td></tr>" +
            "    </table>" +
            "  </div>" +

            // Descripción del plan
            "  <div style='background: #fef9c3; border-left: 4px solid #eab308; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px;'>" +
            "    <p style='margin: 0; font-size: 0.9rem; color: #713f12;'><strong>Incluye:</strong> " + descripcion + "</p>" +
            "  </div>" +

            "  <p style='color: #555; font-size: 0.95rem;'>Recuerda presentar tu <strong>DNI</strong> al ingresar al gimnasio. Si tienes alguna consulta, no dudes en contactarnos en recepción.</p>" +
            "  <p style='color: #555;'>¡Te esperamos para entrenar con todo! 💪</p>" +
            "  <br>" +
            "  <p style='color: #888; font-size: 0.85rem;'>Saludos cordiales,<br><strong style='color: #1a1a2e;'>El equipo de The Jungle Gym</strong></p>" +
            "</div>" +

            "</div></body></html>";
    }

    private String construirHtmlConfirmacionVenta(SolicitudProducto sol) {
        StringBuilder itemsHtml = new StringBuilder();
        if (sol.getItems() != null) {
            for (DetalleSolicitudProducto d : sol.getItems()) {
                String prodName = d.getProducto() != null ? d.getProducto().getNombre() : "Producto";
                itemsHtml.append("<li style='margin-bottom: 8px;'>")
                        .append("<strong>").append(d.getCantidad()).append("x ").append(prodName).append("</strong>")
                        .append(" - S/ ").append(d.getPrecioUnitario().multiply(java.math.BigDecimal.valueOf(d.getCantidad())).setScale(2, java.math.RoundingMode.HALF_UP))
                        .append("</li>");
            }
        }

        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>" +
                "<div style='text-align: center; margin-bottom: 20px;'>" +
                "  <h2 style='color: #ff3e3e; margin: 0;'>¡Compra Aprobada Exitosamente!</h2>" +
                "  <p style='color: #666;'>Tu pedido en The Jungle Gym está listo para retirar</p>" +
                "</div>" +
                "<p>Hola <strong>" + sol.getNombreCompleto() + "</strong>,</p>" +
                "<p>Tu pago con número de operación <strong>" + sol.getNumeroOperacion() + "</strong> ha sido verificado y aprobado.</p>" +
                "<div style='background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed #cbd5e1;'>" +
                "  <p style='margin: 0 0 5px 0; font-size: 0.9rem; color: #64748b; font-weight: bold;'>CÓDIGO ÚNICO DE RECOJO</p>" +
                "  <h1 style='margin: 0; color: #ff3e3e; letter-spacing: 2px; font-size: 2.2rem;'>SOL-" + sol.getId() + "</h1>" +
                "  <p style='margin: 5px 0 0 0; font-size: 0.85rem; color: #ef4444;'>Presenta este código en recepción para recibir tus productos.</p>" +
                "</div>" +
                "<h3>Detalle del Pedido:</h3>" +
                "<ul>" +
                itemsHtml.toString() +
                "</ul>" +
                "<p style='font-size: 1.1rem;'><strong>Total pagado: S/ " + sol.getTotal().setScale(2, java.math.RoundingMode.HALF_UP) + "</strong></p>" +
                "<br>" +
                "<p>¡Gracias por tu preferencia!<br><strong>El equipo de The Jungle Gym</strong></p>" +
                "</div>";
    }
}
