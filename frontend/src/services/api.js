import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: inyectar el Bearer Token JWT
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor de Respuestas: interceptar expiración de sesión (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    // Si el servidor retorna 401 (No autorizado/Sesión expirada)
    if (status === 401) {
      console.warn("Sesión expirada o token inválido. Redirigiendo a Login...");
      sessionStorage.clear();
      // Redirigir a login de forma no intrusiva si no estamos ya en la ruta de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
