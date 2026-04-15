import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogIn, ShieldCheck, User, Lock, Eye, EyeOff } from 'lucide-react';
import '../App.css';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:8080/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.rol);
        
        if (data.rol === 'RECEPCIONISTA') {
          navigate('/asistencia');
        } else {
          navigate('/');
        }
      } else {
        setError('Credenciales incorrectas. Por favor, verifica tu usuario y contraseña.');
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
              <div className="logo-circle">
                <Dumbbell size={40} color="white" strokeWidth={2.5} />
              </div>
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
