package com.gym.validators;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ValidadorComprobanteSunat.class)
@Target({ElementType.TYPE, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidSunatDocument {
    String message() default "El documento ingresado no cumple con las normativas de SUNAT";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
