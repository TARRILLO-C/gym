import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  User,
  Clock,
  History,
  X
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';

const Asistencia = () => {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const resp = await api.get('/asistencias');
      // Sort by date descending
      const sorted = resp.data.sort((a, b) => new Date(b.fechaHoraIngreso) - new Date(a.fechaHoraIngreso));
      setHistoryData(sorted);
      setShowHistory(true);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

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
          .history-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
            animation: fadeIn 0.3s ease-out;
          }
          .history-modal {
            width: 100%;
            max-width: 800px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            border-radius: 24px;
            background: var(--bg-color);
            background-image: var(--body-bg-gradient);
            border: 1px solid var(--panel-border);
            box-shadow: 0 24px 48px rgba(0,0,0,0.4);
            overflow: hidden;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .history-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .history-table th {
            padding: 16px 20px;
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1px;
            border-bottom: 1px solid var(--panel-border);
            position: sticky;
            top: 0;
            background: var(--bg-color);
            z-index: 10;
          }
          .history-table td {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            color: var(--text-main);
          }
          .history-table tbody tr {
            transition: var(--transition-smooth);
          }
          .history-table tbody tr:hover {
            background: rgba(255, 255, 255, 0.05);
          }
          .close-btn {
            background: rgba(255,255,255,0.05);
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-smooth);
          }
          .close-btn:hover {
            background: rgba(255,62,62,0.1);
            color: var(--accent-primary);
            transform: rotate(90deg);
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .history-soft-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 28px;
            border-radius: 30px;
            background: var(--panel-bg);
            color: var(--text-muted);
            border: 1px solid var(--panel-border);
            cursor: pointer;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          }
          .history-soft-btn:hover {
            color: var(--accent-primary);
            border-color: var(--accent-primary);
            background: rgba(255, 62, 62, 0.04);
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(255, 62, 62, 0.1);
          }
          .history-soft-btn:active {
            transform: translateY(0);
          }
          .history-soft-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
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
            .history-table th, .history-table td {
              padding: 12px 10px;
            }
          }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button 
            className="history-soft-btn" 
            onClick={fetchHistory}
            disabled={loadingHistory}
          >
            <History size={18} />
            {loadingHistory ? 'Cargando...' : 'Ver Historial'}
          </button>
        </div>

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} />
                      <span>Socio: {result.data.socio.nombreCompleto}</span>
                    </div>
                    {result.data.fechaHoraIngreso && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} />
                        <span>Hora de entrada: {new Date(result.data.fechaHoraIngreso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    )}
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

      {showHistory && (
        <div className="history-overlay">
          <div className="glass history-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <History style={{ color: 'var(--accent-secondary)' }} size={28} />
                <span className="text-gradient">Historial de Ingresos</span>
              </h2>
              <button className="close-btn" onClick={() => setShowHistory(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, position: 'relative' }}>
              {historyData.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <History size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                  <p>No hay registros de asistencia aún.</p>
                </div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>DNI</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((record) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--panel-border)' }}>
                              <User size={14} color="var(--accent-secondary)" />
                            </div>
                            {record.socio?.nombreCompleto || 'Desconocido'}
                          </div>
                        </td>
                        <td style={{ opacity: 0.8 }}>{record.socio?.dni || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
                            <Clock size={14} color="var(--text-muted)" />
                            {record.fechaHoraIngreso ? new Date(record.fechaHoraIngreso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Asistencia;
