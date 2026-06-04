import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, FileText, ShoppingBag, Award, PackageCheck } from 'lucide-react';
import Modal from '../components/ui/Modal';

const SolicitudesMembresia = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); // Action loading state
  const [requestType, setRequestType] = useState('MEMBRESIA'); // 'MEMBRESIA' or 'PRODUCTO'
  const [activeTab, setActiveTab] = useState('PENDIENTE'); // 'PENDIENTE', 'APROBADA', 'RECOGIDO', 'RECHAZADA'

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchSolicitudes();
  }, [requestType, activeTab]);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      let url = '';
      if (requestType === 'MEMBRESIA') {
        url = activeTab === 'PENDIENTE'
          ? 'http://localhost:8080/api/solicitudes-membresia/pendientes'
          : 'http://localhost:8080/api/solicitudes-membresia';
      } else {
        url = activeTab === 'PENDIENTE'
          ? 'http://localhost:8080/api/solicitudes-venta/pendientes'
          : 'http://localhost:8080/api/solicitudes-venta';
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (activeTab !== 'PENDIENTE') {
          setSolicitudes(data.filter(s => s.estado === activeTab));
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

  const requestConfirmation = (title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showAlert = (title, message) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
    });
  };

  const handleAprobar = (id) => {
    const confirmationText = requestType === 'MEMBRESIA'
      ? "¿Está seguro de aprobar esta solicitud de membresía? Se creará el socio y se registrará su suscripción y pago automáticamente."
      : "¿Está seguro de aprobar esta solicitud de compra? Se registrará la venta oficial y quedará pendiente para su recojo.";

    requestConfirmation("Aprobar Solicitud", confirmationText, async () => {
      setProcessing(true);
      try {
        const endpoint = requestType === 'MEMBRESIA'
          ? `http://localhost:8080/api/solicitudes-membresia/${id}/aprobar`
          : `http://localhost:8080/api/solicitudes-venta/${id}/aprobar`;

        const res = await fetch(endpoint, {
          method: 'POST'
        });
        if (res.ok) {
          showAlert("Aprobación Exitosa", "La solicitud ha sido aprobada con éxito.");
          fetchSolicitudes();
        } else {
          const err = await res.text();
          showAlert("Error", "Error al aprobar: " + err);
        }
      } catch (error) {
        console.error(error);
        showAlert("Error de Red", "No se pudo conectar con el servidor.");
      } finally {
        setProcessing(false);
      }
    });
  };

  const handleRechazar = (id) => {
    requestConfirmation("Rechazar Solicitud", "¿Está seguro de rechazar esta solicitud?", async () => {
      setProcessing(true);
      try {
        const endpoint = requestType === 'MEMBRESIA'
          ? `http://localhost:8080/api/solicitudes-membresia/${id}/rechazar`
          : `http://localhost:8080/api/solicitudes-venta/${id}/rechazar`;

        const res = await fetch(endpoint, {
          method: 'POST'
        });
        if (res.ok) {
          showAlert("Solicitud Rechazada", "La solicitud ha sido rechazada.");
          fetchSolicitudes();
        } else {
          showAlert("Error", "Error al rechazar.");
        }
      } catch (error) {
        console.error(error);
        showAlert("Error de Red", "No se pudo conectar con el servidor.");
      } finally {
        setProcessing(false);
      }
    });
  };

  const handleRecoger = (id) => {
    requestConfirmation("Confirmar Entrega de Productos", "¿Confirmar que el cliente ha recogido los productos y la entrega ha sido completada?", async () => {
      setProcessing(true);
      try {
        const res = await fetch(`http://localhost:8080/api/solicitudes-venta/${id}/recoger`, {
          method: 'POST'
        });
        if (res.ok) {
          showAlert("Pedido Entregado", "El pedido ha sido marcado como entregado/recogido con éxito.");
          fetchSolicitudes();
        } else {
          const err = await res.text();
          showAlert("Error", "Error al actualizar la entrega: " + err);
        }
      } catch (error) {
        console.error(error);
        showAlert("Error de Red", "No se pudo conectar con el servidor.");
      } finally {
        setProcessing(false);
      }
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="fade-in">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Fullscreen Loading Overlay during action processing */}
      {processing && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid rgba(255, 62, 62, 0.15)',
            borderTop: '6px solid var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }} />
          <h3 style={{ color: 'white', margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '1.4rem' }}>Procesando Solicitud</h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '1rem', textAlign: 'center', maxWidth: '400px', px: '20px', lineHeight: '1.4' }}>
            Por favor espere, estamos guardando la información y enviando el correo de confirmación al cliente...
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} color="var(--accent-primary)" />
          Gestión de Solicitudes de Pago
        </h2>
        <button className="btn-secondary" onClick={fetchSolicitudes} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <RefreshCw size={18} /> Actualizar
        </button>
      </div>

      {/* Main Switcher: Membresías vs Productos */}
      <div className="card glass" style={{ marginBottom: '20px', padding: '15px', display: 'flex', gap: '15px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
        <button 
          className={requestType === 'MEMBRESIA' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setRequestType('MEMBRESIA'); setActiveTab('PENDIENTE'); setSolicitudes([]); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1.05rem' }}
        >
          <Award size={20} />
          Membresías
        </button>
        <button 
          className={requestType === 'PRODUCTO' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setRequestType('PRODUCTO'); setActiveTab('PENDIENTE'); setSolicitudes([]); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1.05rem' }}
        >
          <ShoppingBag size={20} />
          Productos
        </button>
      </div>

      {/* State Tabs: Pendiente, Aprobada, Rechazada, Recogida */}
      <div className="card glass" style={{ marginBottom: '20px', padding: '10px', display: 'flex', gap: '10px' }}>
        <button 
          className={activeTab === 'PENDIENTE' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('PENDIENTE'); setSolicitudes([]); }}
        >
          {requestType === 'MEMBRESIA' ? 'Pendientes' : 'Pendientes de Pago'}
        </button>
        <button 
          className={activeTab === 'APROBADA' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('APROBADA'); setSolicitudes([]); }}
        >
          {requestType === 'MEMBRESIA' ? 'Aprobadas' : 'Pendientes de Recojo'}
        </button>
        {requestType === 'PRODUCTO' && (
          <button 
            className={activeTab === 'RECOGIDO' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => { setActiveTab('RECOGIDO'); setSolicitudes([]); }}
          >
            Entregadas / Recogidas
          </button>
        )}
        <button 
          className={activeTab === 'RECHAZADA' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => { setActiveTab('RECHAZADA'); setSolicitudes([]); }}
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
              {requestType === 'MEMBRESIA' ? (
                <tr>
                  <th>Fecha</th>
                  <th>DNI</th>
                  <th>Cliente</th>
                  <th>Plan Seleccionado</th>
                  <th>Estado</th>
                  <th>Operación / Comprobante</th>
                  <th>Acciones</th>
                </tr>
              ) : (
                <tr>
                  <th>Fecha</th>
                  <th>DNI</th>
                  <th>Cliente</th>
                  <th>Productos Pedidos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Operación / Comprobante</th>
                  <th>Acciones</th>
                </tr>
              )}
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
                  {requestType === 'MEMBRESIA' ? (
                    <>
                      <td>{sol.membresiaNombre}</td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {sol.detalles?.map(d => (
                            <div key={d.id} style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              • {d.cantidad}x <span>{d.producto?.nombre}</span> <span style={{ color: 'var(--text-muted)' }}>(S/ {d.precioUnitario?.toFixed(2)})</span>
                            </div>
                          ))}
                          {sol.codigoEntrega && (
                            <div style={{ marginTop: '8px' }}>
                              <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255, 62, 62, 0.15)', border: '1px solid #ff3e3e', padding: '3px 8px', borderRadius: '4px', color: '#ff3e3e', fontWeight: 'bold', display: 'inline-block' }}>
                                Código Recojo: {sol.codigoEntrega}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td><strong>S/ {sol.total?.toFixed(2)}</strong></td>
                    </>
                  )}
                  <td>
                    {requestType === 'MEMBRESIA' ? (
                      <span className={`status-badge status-${sol.estado.toLowerCase()}`}>
                        {sol.estado}
                      </span>
                    ) : (
                      <span className={`status-badge status-${sol.estado.toLowerCase()}`} style={
                        sol.estado === 'APROBADA' ? { backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' } :
                        sol.estado === 'RECOGIDO' ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' } : {}
                      }>
                        {sol.estado === 'APROBADA' ? 'PENDIENTE RECOJO' : sol.estado}
                      </span>
                    )}
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
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {sol.estado === 'PENDIENTE' && (
                        <>
                          <button 
                            onClick={() => handleAprobar(sol.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}
                            title={requestType === 'MEMBRESIA' ? "Aprobar y Registrar Socio" : "Aprobar y Registrar Venta"}
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
                        </>
                      )}
                      {sol.estado === 'APROBADA' && requestType === 'PRODUCTO' && (
                        <button 
                          onClick={() => handleRecoger(sol.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                          title="Marcar como Recogido / Entregado"
                        >
                          <PackageCheck size={24} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmación */}
      <Modal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
      >
        <div style={{ padding: '5px 0' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            {confirmModal.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </button>
            <button 
              className="btn-primary" 
              onClick={confirmModal.onConfirm}
              style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Alerta */}
      <Modal 
        isOpen={alertModal.isOpen} 
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
      >
        <div style={{ padding: '5px 0' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            {alertModal.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn-primary" 
              onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SolicitudesMembresia;
