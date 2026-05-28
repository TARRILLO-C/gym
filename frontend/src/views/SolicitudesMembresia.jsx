import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, FileText } from 'lucide-react';
import Modal from '../components/ui/Modal';

const SolicitudesMembresia = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDIENTE');
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAprobar = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Acción',
      message: "¿Está seguro de aprobar esta solicitud? Se creará el socio y se registrará su pago automáticamente.",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          const res = await fetch(`http://localhost:8080/api/solicitudes-membresia/${id}/aprobar`, {
            method: 'POST'
          });
          if (res.ok) {
            showNotification("Solicitud aprobada con éxito. El socio ha sido registrado.", 'success');
            fetchSolicitudes();
          } else {
            const err = await res.text();
            showNotification("Error al aprobar: " + err, 'error');
          }
        } catch (error) {
          console.error(error);
          showNotification("Error de red", 'error');
        }
      }
    });
  };

  const handleRechazar = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Acción',
      message: "¿Está seguro de rechazar esta solicitud?",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          const res = await fetch(`http://localhost:8080/api/solicitudes-membresia/${id}/rechazar`, {
            method: 'POST'
          });
          if (res.ok) {
            showNotification("Solicitud rechazada.", 'success');
            fetchSolicitudes();
          } else {
            showNotification("Error al rechazar.", 'error');
          }
        } catch (error) {
          console.error(error);
          showNotification("Error de red", 'error');
        }
      }
    });
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

        .notification {
          position: fixed;
          top: 80px;
          right: 20px;
          padding: 16px 20px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          z-index: 2000;
          animation: slideInRight 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 320px;
          max-width: 400px;
          backdrop-filter: blur(8px);
        }
        .notification.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 2px solid #047857;
        }
        .notification.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: 2px solid #b91c1c;
        }
        .notification.warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border: 2px solid #b45309;
        }
        .notification.info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: 2px solid #1d4ed8;
        }
        @media (prefers-color-scheme: dark) {
          .notification.success {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            border: 2px solid #065f46;
          }
          .notification.error {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            border: 2px solid #991b1b;
          }
          .notification.warning {
            background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
            border: 2px solid #92400e;
          }
          .notification.info {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border: 2px solid #1e40af;
          }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
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
            backgroundColor: '#6b7280',
            boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)'
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
                        <a href={sol.comprobanteUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#3b82f6', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
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

      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <XCircle size={20} />}
          {notification.type === 'warning' && <RefreshCw size={20} />}
          {notification.type === 'info' && <FileText size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Confirm Dialog */}
      <Modal 
        isOpen={confirmDialog?.isOpen} 
        onClose={() => setConfirmDialog({ isOpen: false })} 
        title={confirmDialog?.title || 'Confirmar Acción'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{confirmDialog?.message}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setConfirmDialog({ isOpen: false })} 
              style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancelar
            </button>
            <button 
              className="btn-primary" 
              onClick={() => {
                if(confirmDialog?.onConfirm) confirmDialog.onConfirm();
                setConfirmDialog({ isOpen: false });
              }} 
              style={{ padding: '10px 24px' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SolicitudesMembresia;
