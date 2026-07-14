package com.gym.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Servicio encargado de la generación, parseo y validación de tokens JWT (JSON Web Tokens).
 * Utiliza la API moderna de JJWT 0.12.x compatible con Java 21 y Spring Security 6.
 */
@Service
public class JwtService {

    /**
     * Clave de firma simétrica HMAC SHA. Debe tener al menos 256 bits y estar en Base64.
     * Si no se provee en application.properties se utiliza una firma robusta de fallback.
     */
    @Value("${jwt.secret:dGhlLWp1bmdsZS1neW0tbWFuYWdlbWVudC1zZWN1cml0eS1rZXktMjAyNi1iZWF1dGlmdWw=}")
    private String secretKey;

    /** Tiempo de expiración del token. Por defecto 10 horas (36,000,000 ms) */
    @Value("${jwt.expiration:36000000}")
    private long jwtExpirationMs;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Genera un token JWT incluyendo claims personalizados de seguridad.
     * @param username Nombre del usuario autenticado.
     * @param rol Nombre del rol asignado.
     * @param permisos Lista de permisos granulares asignados.
     * @return Cadena formateada del Token JWT.
     */
    public String generateToken(String username, String rol, List<String> permisos) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("rol", rol);
        extraClaims.put("permisos", permisos);
        return generateToken(extraClaims, username);
    }

    public String generateToken(Map<String, Object> extraClaims, String username) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
