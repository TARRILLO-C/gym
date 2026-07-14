import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogIn, ShieldCheck, User, Lock, Eye, EyeOff } from 'lucide-react';
import '../App.css';
import './Login.css';
import { API_BASE_URL } from '../services/api';
import { usePermissions } from '../context/PermissionsContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const navigate = useNavigate();
  const { refreshPermisos } = usePermissions();

  useEffect(() => {
    fetch(`${API_BASE_URL}/web-config`)
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      })
      .catch(err => console.error('Error fetching logo:', err));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('isAuthenticated', 'true');
        sessionStorage.setItem('username', data.usuario.username);
        sessionStorage.setItem('role', data.rol);
        
        // Guardar permisos RBAC
        const permisos = data.permisos;
        if (Array.isArray(permisos)) {
          sessionStorage.setItem('permisos', JSON.stringify(permisos));
        } else {
          sessionStorage.setItem('permisos', '[]');
        }
        
        // Refrescar reactivamente los permisos en el contexto
        refreshPermisos();
        
        if (data.rol === 'RECEPCIONISTA') {
          navigate('/asistencia');
        } else {
          navigate('/');
        }
      } else if (response.status === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError('Ocurrió un error inesperado al conectar con el servidor.');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor. Verifica tu conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-overlay"></div>
      
      <div className="login-container">
        <div className="login-visual-side">
          {/* This side could have some text or just the image vibe */}
          <div className="visual-content">
            <h2 className="visual-title">ELEVA TU <br/><span className="text-gradient">POTENCIAL</span></h2>
            <p className="visual-text">Bienvenido a la jungla. Donde los campeones se forjan cada día.</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ height: '80px', width: '80px', objectFit: 'contain', borderRadius: '15px' }} />
              ) : (
                <div className="logo-circle">
                  <Dumbbell size={40} color="white" strokeWidth={2.5} />
                </div>
              )}
            </div>
            <h1 className="login-title text-gradient">THE JUNGLE</h1>
            <p className="login-subtitle">GESTIÓN DE ALTO RENDIMIENTO</p>
          </div>
          
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">USUARIO</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input 
                  className="input-field"
                  type="text" 
                  placeholder="Introduce tu usuario" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">CONTRASEÑA</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input 
                  className="input-field"
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="error-msg animate-shake">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn-primary login-btn" 
              disabled={loading}
            >
              {loading ? (
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <>
                  <span>ACCEDER AL SISTEMA</span>
                  <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="secure-badge">
              <ShieldCheck size={14} />
              <span>SISTEMA SEGURO BIOMÉTRICO</span>
            </div>
            <p className="copyright">&copy; 2026 The Jungle Gym. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
