import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  User 
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';

const Asistencia = () => {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!dni || dni.length < 5) return;

    setLoading(true);
    setResult(null);
    try {
      const resp = await api.post('/asistencias/registrar-ingreso', { dni });
      setResult({
        success: true,
        message: '¡Acceso Concedido!',
        data: resp.data
      });
      setDni('');
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || 'Error desconocido';
      
      setResult({
        success: false,
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title={<span>Control de <span className="text-gradient">Acceso</span></span>}
      subtitle="Ingresa el DNI del socio para validar su ingreso al gimnasio en tiempo real."
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <section className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <form onSubmit={handleRegister} style={{ position: 'relative', display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={24} 
                color="var(--text-muted)" 
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type="text" 
                placeholder="Ej: 72839401" 
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                style={{ paddingLeft: '56px', fontSize: '1.2rem', height: '64px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}
                maxLength={12}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || !dni}
              style={{ width: '180px', height: '64px', fontSize: '1.1rem' }}
            >
              {loading ? 'Validando...' : 'REGISTRAR'}
            </button>
          </form>

          {result && (
            <div 
              className="card" 
              style={{ 
                marginTop: '40px', 
                border: `2px solid ${result.success ? '#00ff7f' : '#ff3e3e'}`,
                background: result.success ? 'rgba(0, 255, 127, 0.05)' : 'rgba(255, 62, 62, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                padding: '32px',
                textAlign: 'left'
              }}
            >
              <div style={{ 
                background: result.success ? '#00ff7f' : '#ff3e3e',
                padding: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-color)' // Contraste dinámico
              }}>
                {result.success ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '4px', color: result.success ? 'var(--text-main)' : '#ff3e3e' }}>{result.message}</h3>
                {result.success && result.data?.socio && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <User size={16} />
                    <span>Socio: {result.data.socio.nombreCompleto}</span>
                  </div>
                )}
                {!result.success && (
                  <p style={{ color: '#ff3e3e', fontWeight: 'bold', marginTop: '8px' }}>
                    {result.message.includes("DENEGADO") 
                      ? "BLOQUEO ACTIVO: El socio no puede ingresar hasta que regularice su deuda."
                      : "Comuníquese con administración para regularizar su situación."}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <div style={{ marginTop: '40px' }}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} /> Sistema de vigilancia activo. Tema dinámico activado.
          </p>
        </div>
      </div>
    </PageLayout>
  );
};

export default Asistencia;
