package com.gym.dtos.auth;

public class LoginResponse {
    private String username;
    private String rol;
    private String message;

    public LoginResponse(String username, String rol, String message) {
        this.username = username;
        this.rol = rol;
        this.message = message;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
