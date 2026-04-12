import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogIn, ShieldCheck } from 'lucide-react';
import '../App.css';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-circle">
              <Dumbbell size={36} color="white" />
            </div>
          </div>
          <h1 className="login-title">THE JUNGLE</h1>
          <p className="login-subtitle">Sistema de Gestión de Gimnasio</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">USUARIO</label>
            <div className="input-wrapper">
              <input 
                className="input-field"
                type="text" 
                placeholder="Introduzca su usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">CONTRASEÑA</label>
            <div className="input-wrapper">
              <input 
                className="input-field"
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          {error && <div className="error-msg">{error}</div>}
          
          <button 
            type="submit" 
            className="btn-primary login-btn" 
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                Acceder al sistema
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ShieldCheck size={16} /> Conexión segura habilitada
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
