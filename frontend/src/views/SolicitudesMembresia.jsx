import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, FileText } from 'lucide-react';

const SolicitudesMembresia = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDIENTE');

  useEffect(() => {
    fetchSolicitudes();
  }, [activeTab]);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'PENDIENTE' 
        ? 'http://localhost:8080/api/solicitudes-membresia/pendientes'
        : 'http://localhost:8080/api/solicitudes-membresia';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (activeTab !== 'PENDIENTE') {
          // If all, we might want to still filter or just show them
          setSolicitudes(data.filter(s => s.estado === activeTab || activeTab === 'TODAS'));
        } else {
          setSolicitudes(data);
        }
      }
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    if (!window.confirm("¿Está seguro de aprobar esta solicitud? Se creará el socio y se registrará su pago automáticamente.")) return;
    
    try {
      const res = await fetch(`http://localhost:8080/api/solicitudes-membresia/${id}/aprobar`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Solicitud aprobada con éxito. El socio ha sido registrado.");
        fetchSolicitudes();
      } else {
        const err = await res.text();
        alert("Error al aprobar: " + err);
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
    }
  };

  const handleRechazar = async (id) => {
    if (!window.confirm("¿Está seguro de rechazar esta solicitud?")) return;
    
    try {
      const res = await fetch(`http://localhost:8080/api/solicitudes-membresia/${id}/rechazar`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Solicitud rechazada.");
        fetchSolicitudes();
      } else {
        alert("Error al rechazar.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActiveColor = () => {
    if (activeTab === 'PENDIENTE') return '#f59e0b';
    if (activeTab === 'APROBADA') return '#22c55e';
    if (activeTab === 'RECHAZADA') return '#ef4444';
    return 'var(--accent-primary)';
  };

  return (
    <div className="fade-in">
      <style>{`
        .tab-btn-pendiente {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          border: 1px solid #f59e0b;
          background-color: transparent;
          color: #f59e0b;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .tab-btn-pendiente.active {
          background-color: #f59e0b;
          color: white;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        .tab-btn-pendiente:hover {
          background-color: rgba(245, 158, 11, 0.1);
        }
        .tab-btn-pendiente.active:hover {
          background-color: #d97706;
          border-color: #d97706;
        }

        .tab-btn-aprobada {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          border: 1px solid #22c55e;
          background-color: transparent;
          color: #22c55e;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .tab-btn-aprobada.active {
          background-color: #22c55e;
          color: white;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
        }
        .tab-btn-aprobada:hover {
          background-color: rgba(34, 197, 94, 0.1);
        }
        .tab-btn-aprobada.active:hover {
          background-color: #16a34a;
          border-color: #16a34a;
        }

        .tab-btn-rechazada {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          border: 1px solid #ef4444;
          background-color: transparent;
          color: #ef4444;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .tab-btn-rechazada.active {
          background-color: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        .tab-btn-rechazada:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
        .tab-btn-rechazada.active:hover {
          background-color: #dc2626;
          border-color: #dc2626;
        }

        .btn-update {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: bold;
          border: none;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-update:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        .btn-update:active {
          transform: translateY(0);
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} color="var(--accent-primary)" />
          Solicitudes de Membresía
        </h2>
        <button 
          className="btn-update" 
          onClick={fetchSolicitudes} 
          style={{ 
            backgroundColor: getActiveColor(),
            boxShadow: `0 4px 12px ${getActiveColor()}44`
          }}
        >
          <RefreshCw size={18} /> Actualizar
        </button>
      </div>

      <div className="card glass" style={{ marginBottom: '20px', padding: '10px', display: 'flex', gap: '10px' }}>
        <button 
          className={`tab-btn-pendiente ${activeTab === 'PENDIENTE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDIENTE')}
        >
          Pendientes
        </button>
        <button 
          className={`tab-btn-aprobada ${activeTab === 'APROBADA' ? 'active' : ''}`}
          onClick={() => setActiveTab('APROBADA')}
        >
          Aprobadas
        </button>
        <button 
          className={`tab-btn-rechazada ${activeTab === 'RECHAZADA' ? 'active' : ''}`}
          onClick={() => setActiveTab('RECHAZADA')}
        >
          Rechazadas
        </button>
      </div>

      <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '12px 15px', borderRadius: '4px', marginBottom: '20px' }}>
        <p style={{ margin: 0, color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>Seguridad Antifraude:</strong> Antes de aprobar una solicitud, verifique en su aplicación bancaria (Yape/Plin/BCP) que el <strong>Número de Operación</strong> y el monto coincidan con el comprobante adjunto.
        </p>
      </div>

      <div className="card glass" style={{ padding: '0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando solicitudes...</div>
        ) : solicitudes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay solicitudes en esta categoría.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>DNI</th>
                <th>Cliente</th>
                <th>Plan Seleccionado</th>
                <th>Estado</th>
                <th>Operación / Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map(sol => (
                <tr key={sol.id}>
                  <td>{formatDate(sol.fechaSolicitud)}</td>
                  <td><strong>{sol.dni}</strong></td>
                  <td>
                    {sol.nombreCompleto}<br/>
                    <small style={{ color: 'var(--text-muted)' }}>{sol.telefono} {sol.email ? `| ${sol.email}` : ''}</small>
                  </td>
                  <td>{sol.membresiaNombre}</td>
                  <td>
                    <span className={`status-badge status-${sol.estado.toLowerCase()}`}>
                      {sol.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {sol.numeroOperacion && (
                         <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                           N°: {sol.numeroOperacion}
                         </span>
                      )}
                      {sol.comprobanteUrl ? (
                        <a href={sol.comprobanteUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                          <Eye size={16} /> Ver Comprobante
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No adjunto</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {sol.estado === 'PENDIENTE' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => handleAprobar(sol.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}
                          title="Aprobar y Registrar Socio"
                        >
                          <CheckCircle size={24} />
                        </button>
                        <button 
                          onClick={() => handleRechazar(sol.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          title="Rechazar"
                        >
                          <XCircle size={24} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SolicitudesMembresia;
