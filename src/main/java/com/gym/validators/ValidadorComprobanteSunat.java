package com.gym.validators;

import com.gym.controllers.VentaController.EmitirRequest;
import com.gym.controllers.VentaController.VentaRequest;
import com.gym.models.DetalleVenta;
import com.gym.models.Venta.TipoComprobante;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.math.BigDecimal;
import java.util.List;

public class ValidadorComprobanteSunat implements ConstraintValidator<ValidSunatDocument, Object> {

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) return true;

        if (value instanceof VentaRequest req) {
            return validarVentaRequest(req, context);
        } else if (value instanceof EmitirRequest req) {
            return validarEmitirRequest(req, context);
        }

        return true;
    }

    private boolean validarVentaRequest(VentaRequest req, ConstraintValidatorContext context) {
        if (req.getTipoComprobante() == null) return true;

        // Calcular el total de la venta
        BigDecimal total = BigDecimal.ZERO;
        if (req.getDetalles() != null) {
            for (DetalleVenta dv : req.getDetalles()) {
                if (dv.getPrecioUnitario() != null && dv.getCantidad() != null) {
                    total = total.add(dv.getPrecioUnitario().multiply(new BigDecimal(dv.getCantidad())));
                }
            }
        }

        if (req.getTipoComprobante() == TipoComprobante.FACTURA) {
            return validarReglasFactura(req.getClienteDocumento(), req.getClienteNombre(), context);
        } else if (req.getTipoComprobante() == TipoComprobante.BOLETA) {
            return validarReglasBoleta(req.getClienteDocumento(), req.getClienteNombre(), total, context);
        }

        return true;
    }

    private boolean validarEmitirRequest(EmitirRequest req, ConstraintValidatorContext context) {
        if (req.getTipo() == null) return true;

        if (req.getTipo() == TipoComprobante.FACTURA) {
            return validarReglasFactura(req.getRuc(), req.getRazonSocial(), context);
        }
        // Boleta en re-emision usualmente hereda total o simplemente valida DNI
        if (req.getTipo() == TipoComprobante.BOLETA && req.getRuc() != null && !req.getRuc().trim().isEmpty()) {
            if (!req.getRuc().matches("\\d{8}")) {
                agregarViolacion(context, "ruc", "El DNI para la boleta debe ser de exactamente 8 dígitos numéricos");
                return false;
            }
        }

        return true;
    }

    private boolean validarReglasFactura(String documento, String nombre, ConstraintValidatorContext context) {
        if (documento == null || documento.trim().isEmpty()) {
            agregarViolacion(context, "clienteDocumento", "El RUC es estrictamente obligatorio para Facturas");
            return false;
        }
        if (!documento.matches("^(10|20)\\d{9}$")) {
            agregarViolacion(context, "clienteDocumento", "El RUC debe tener exactamente 11 dígitos y empezar con 10 o 20");
            return false;
        }
        if (nombre == null || nombre.trim().isEmpty()) {
            agregarViolacion(context, "clienteNombre", "La Razón Social es obligatoria para emitir Factura");
            return false;
        }
        return true;
    }

    private boolean validarReglasBoleta(String documento, String nombre, BigDecimal total, ConstraintValidatorContext context) {
        boolean superaMonto = total.compareTo(new BigDecimal("700.00")) > 0;
        
        if (superaMonto) {
            if (documento == null || !documento.matches("\\d{8}")) {
                agregarViolacion(context, "clienteDocumento", "Al superar S/ 700.00, el DNI (8 dígitos) es obligatorio por ley");
                return false;
            }
            if (nombre == null || nombre.trim().isEmpty()) {
                agregarViolacion(context, "clienteNombre", "Al superar S/ 700.00, el Nombre completo del cliente es obligatorio");
                return false;
            }
        } else {
            // Si proporcionó documento voluntariamente pero es invalido
            if (documento != null && !documento.trim().isEmpty() && !documento.matches("\\d{8}")) {
                agregarViolacion(context, "clienteDocumento", "Si se ingresa DNI, debe tener exactamente 8 dígitos");
                return false;
            }
        }
        
        return true;
    }

    private void agregarViolacion(ConstraintValidatorContext context, String nodo, String mensaje) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(mensaje)
               .addPropertyNode(nodo)
               .addConstraintViolation();
    }
}
