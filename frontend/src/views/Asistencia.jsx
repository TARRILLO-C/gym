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
    if (!dni || dni.length !== 8) {
      setResult({
        success: false,
        message: 'El DNI debe tener exactamente 8 dígitos.'
      });
      return;
    }

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
        <style>{`
          .asistencia-card {
            padding: 48px;
            text-align: center;
          }
          .asistencia-form {
            position: relative;
            display: flex;
            gap: 16px;
          }
          .asistencia-input-wrapper {
            position: relative;
            flex: 1;
          }
          .asistencia-btn {
            width: 180px;
            height: 64px;
            font-size: 1.1rem;
          }
          .result-card {
            margin-top: 40px;
            display: flex;
            align-items: center;
            gap: 24px;
            padding: 32px;
            text-align: left;
          }
          @media (max-width: 600px) {
            .asistencia-card {
              padding: 24px 16px;
            }
            .asistencia-form {
              flex-direction: column;
            }
            .asistencia-btn {
              width: 100%;
            }
            .result-card {
              flex-direction: column;
              text-align: center;
              padding: 24px 16px;
              gap: 16px;
            }
          }
        `}</style>
        <section className="card asistencia-card">
          <form className="asistencia-form" onSubmit={handleRegister}>
            <div className="asistencia-input-wrapper">
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
                style={{ width: '100%', paddingLeft: '56px', fontSize: '1.2rem', height: '64px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', borderRadius: '12px' }}
                maxLength={8}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary asistencia-btn" 
              disabled={loading || !dni || dni.length !== 8}
            >
              {loading ? 'Validando...' : 'REGISTRAR'}
            </button>
          </form>

          {result && (
            <div 
              className="card result-card" 
              style={{ 
                border: `2px solid ${result.success ? '#00ff7f' : '#ff3e3e'}`,
                background: result.success ? 'rgba(0, 255, 127, 0.05)' : 'rgba(255, 62, 62, 0.05)',
              }}
            >
              <div style={{ 
                background: result.success ? '#00ff7f' : '#ff3e3e',
                padding: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-color)',
                flexShrink: 0
              }}>
                {result.success ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '4px', color: result.success ? 'var(--text-main)' : '#ff3e3e' }}>{result.message}</h3>
                {result.success && result.data?.socio && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', justifyContent: 'inherit' }}>
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
