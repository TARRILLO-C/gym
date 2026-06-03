import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, FileText, X, Package, Users } from 'lucide-react';
import Modal from '../components/ui/Modal';
import api from '../services/api';

const SolicitudesMembresia = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDIENTE');
  const [requestType, setRequestType] = useState('MEMBRESIA'); // 'MEMBRESIA' | 'PRODUCTO'
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  const handleVerComprobante = (url, clientName) => {
    setImageError(false);
    setPreviewImage({ url, title: `Comprobante de ${clientName}` });
  };

  useEffect(() => {
    fetchSolicitudes();
  }, [activeTab, requestType]);

  const getBasePath = () =>
    requestType === 'MEMBRESIA' ? '/solicitudes-membresia' : '/solicitudes-producto';

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const basePath = getBasePath();
      const url =
        activeTab === 'PENDIENTE'
          ? `${basePath}/pendientes`
          : `${basePath}/por-estado/${activeTab}`;

      const res = await api.get(url);
      setSolicitudes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  };

  const switchRequestType = (type) => {
    if (type === requestType) return;
    setRequestType(type);
    setActiveTab('PENDIENTE');
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAprobar = async (id) => {
    const message = requestType === 'MEMBRESIA'
      ? "¿Está seguro de aprobar esta solicitud? Se creará el socio y se registrará su pago automáticamente."
      : "¿Está seguro de aprobar esta solicitud? Se reducirá el stock de los productos y se enviará el comprobante al correo del cliente.";
    
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Acción',
      message,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await api.post(`${getBasePath()}/${id}/aprobar`);
          const successMessage = requestType === 'MEMBRESIA'
            ? "Solicitud aprobada con éxito. El socio ha sido registrado."
            : "Solicitud aprobada con éxito. El stock de los productos ha sido reducido.";
          showNotification(successMessage, 'success');
          fetchSolicitudes();
        } catch (error) {
          console.error(error);
          const msg = error.response?.data?.mensaje || error.message || 'Error de red';
          showNotification("Error al aprobar: " + msg, 'error');
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
          await api.post(`${getBasePath()}/${id}/rechazar`);
          showNotification("Solicitud rechazada.", 'success');
          fetchSolicitudes();
        } catch (error) {
          console.error(error);
          const msg = error.response?.data?.mensaje || error.message || 'Error de red';
          showNotification("Error al rechazar: " + msg, 'error');
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

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} color="var(--accent-primary)" />
          {requestType === 'MEMBRESIA' ? 'Solicitudes de Membresía' : 'Solicitudes de Productos'}
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-update"
            onClick={() => switchRequestType('MEMBRESIA')}
            style={{
              backgroundColor: requestType === 'MEMBRESIA' ? 'var(--accent-primary)' : '#6b7280',
              boxShadow: requestType === 'MEMBRESIA'
                ? '0 4px 12px rgba(255, 62, 62, 0.3)'
                : '0 4px 12px rgba(107, 114, 128, 0.3)'
            }}
          >
            <Users size={18} /> Ver Membresías
          </button>
          <button
            className="btn-update"
            onClick={() => switchRequestType('PRODUCTO')}
            style={{
              backgroundColor: requestType === 'PRODUCTO' ? 'var(--accent-primary)' : '#6b7280',
              boxShadow: requestType === 'PRODUCTO'
                ? '0 4px 12px rgba(255, 62, 62, 0.3)'
                : '0 4px 12px rgba(107, 114, 128, 0.3)'
            }}
          >
            <Package size={18} /> Ver Productos
          </button>
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
      </div>

      <div className="card glass" style={{ marginBottom: '20px', padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                <th>{requestType === 'MEMBRESIA' ? 'Plan Seleccionado' : 'Productos'}</th>
                {requestType === 'PRODUCTO' && <th>Total</th>}
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
                  <td>
                    {requestType === 'MEMBRESIA' ? (
                      sol.membresiaNombre
                    ) : (
                      <div style={{ fontSize: '0.85rem' }}>
                        {sol.items && sol.items.length > 0 ? (
                          sol.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '2px' }}>
                              {item.productoNombre || item.producto?.nombre || 'Producto'} × {item.cantidad}
                            </div>
                          ))
                        ) : (
                          '-'
                        )}
                      </div>
                    )}
                  </td>
                  {requestType === 'PRODUCTO' && (
                    <td>
                      <strong>
                        S/ {Number(sol.total ?? 0).toFixed(2)}
                      </strong>
                    </td>
                  )}
                  <td>
                    <span className={`status-badge status-${sol.estado?.toLowerCase()}`}>
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
                        <button 
                          onClick={() => handleVerComprobante(sol.comprobanteUrl, sol.nombreCompleto)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            color: '#3b82f6', 
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem', 
                            fontWeight: '500',
                            padding: 0
                          }}
                        >
                          <Eye size={16} /> Ver Comprobante
                        </button>
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
                          title={requestType === 'MEMBRESIA' ? 'Aprobar y Registrar Socio' : 'Aprobar y Reducir Stock'}
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(0,0,0,0.85)', 
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{ 
              position: 'relative',
              background: 'var(--panel-bg, #1e293b)',
              border: '1px solid var(--panel-border, #334155)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '600px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              animation: 'scaleIn 0.25s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main, #f8fafc)', fontSize: '1.2rem', fontWeight: '700' }}>
                {previewImage.title}
              </h3>
              <button 
                onClick={() => setPreviewImage(null)}
                style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  borderRadius: '50%', 
                  padding: '8px', 
                  color: 'var(--text-muted, #94a3b8)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '200px',
              maxHeight: '60vh',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              overflow: 'hidden',
              padding: '10px',
              border: '1px solid var(--panel-border, #334155)'
            }}>
              {imageError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px' }}>Error al cargar la imagen</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '300px' }}>
                    El archivo de comprobante no se encuentra en el servidor. Esto suele ocurrir con registros antiguos si el archivo físico no fue conservado.
                  </p>
                </div>
              ) : (
                <img 
                  src={previewImage.url} 
                  alt="Comprobante" 
                  onError={() => setImageError(true)}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '55vh', 
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }} 
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary"
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '10px', 
                  textDecoration: 'none', 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Abrir en pestaña nueva
              </a>
              <button 
                onClick={() => setPreviewImage(null)}
                style={{ 
                  padding: '10px 20px', 
                  background: 'transparent', 
                  border: '1px solid var(--panel-border, #334155)',
                  borderRadius: '10px',
                  color: 'var(--text-main, #f8fafc)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesMembresia;
