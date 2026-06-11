import React, { useEffect, useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit,
  Trash2,
  AlertCircle,
  Filter,
  RotateCcw,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';

const Avatar = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', fontSize: '1.1rem', border: '1px solid rgba(59,130,246,0.2)'
    }}>
      {initial}
    </div>
  );
};

const Socios = () => {
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, ACTIVO, INACTIVO
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    dni: '',
    ruc: '',
    razonSocial: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
    estado: 'ACTIVO'
  });
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const API_CLOUD_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo2MDMsImV4cCI6MTc2NDY4NDM1N30.nH31PRzhb_PF61yLGccnjkkA1ajNZ8jJAKPVwpHL8tA';

  const fetchSocios = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/socios');
      setSocios(resp.data);
    } catch (err) {
      // Mocking datos en caso de falla de Backend
      setSocios([
        { id: 1, nombreCompleto: 'Juan Pérez', dni: '72839401', telefono: '987 654 321', estado: 'ACTIVO' },
        { id: 2, nombreCompleto: 'María García', dni: '71928374', telefono: '912 345 678', estado: 'ACTIVO' },
        { id: 3, nombreCompleto: 'Carlos Ruiz', dni: '73948576', telefono: '923 456 789', estado: 'INACTIVO' },
        { id: 4, nombreCompleto: 'Ana López', dni: '74958671', telefono: '934 567 890', estado: 'ACTIVO' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocios();
  }, []);

  // Autocomplete DNI utilizando Backend Proxy
  useEffect(() => {
    const lookupDni = async () => {
      if (formData.dni.length === 8 && !editingId) {
        setIsSearchingDni(true);
        try {
          const response = await api.get(`/consultas/dni/${formData.dni}`);
          const nombre = response.data?.nombreCompleto || response.data?.datos?.nombreCompleto;
          if (response.data && nombre) {
            setFormData(prev => ({
              ...prev,
              nombreCompleto: nombre
            }));
          }
        } catch (err) {
          console.error("Error consultando DNI localmente:", err);
        } finally {
          setIsSearchingDni(false);
        }
      }
    };
    lookupDni();
  }, [formData.dni, editingId]);


  const handleRegisterOrUpdate = async (e) => {
    e.preventDefault();
    
    // Validación estricta Frontend para correo
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showAlert('Error de Formato', 'El correo electrónico ingresado no es válido (Ej: usuario@dominio.com).');
        return;
      }
    }

    // Validación estricta Frontend para teléfono
    if (formData.telefono && formData.telefono.trim() !== '') {
      if (formData.telefono.length !== 9) {
        showAlert('Error de Formato', 'El número de teléfono debe tener exactamente 9 dígitos.');
        return;
      }
    }

    // Validación estricta Frontend para fecha de nacimiento (tipado manual)
    if (formData.fechaNacimiento && formData.fechaNacimiento.trim() !== '') {
      const birthDate = new Date(formData.fechaNacimiento);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() - 12);
      
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 100);

      if (birthDate > maxDate) {
        showAlert('Error de Fecha', 'La edad mínima para registrarse es de 12 años. Por favor, verifique la fecha de nacimiento.');
        return;
      }
      if (birthDate < minDate) {
        showAlert('Error de Fecha', 'La fecha de nacimiento ingresada es demasiado antigua para ser válida.');
        return;
      }
    }

    try {
      if (editingId) {
        await api.put(`/socios/${editingId}`, formData);
        showToast('Socio actualizado');
      } else {
        await api.post('/socios', formData);
        showToast('Socio registrado');
      }
      closeModal();
      fetchSocios();
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errores) {
        const msgs = Object.values(err.response.data.errores).join(' | ');
        showAlert('Error de Validación', msgs);
      } else if (err.response?.status === 409) {
        showAlert('Error de Duplicidad', err.response?.data?.mensaje || 'El DNI, RUC o Email ya se encuentra registrado en el sistema.');
      } else {
        showAlert('Error', err.response?.data?.mensaje || 'Error al procesar la solicitud');
      }
    }
  };

  const handleLogicalDelete = (socio) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Dar de Baja',
      message: `¿Estás seguro de que deseas dar de baja (desactivar) a ${socio.nombreCompleto}?`,
      onConfirm: async () => {
        try {
          const updatedData = { ...socio, estado: 'INACTIVO' };
          await api.put(`/socios/${socio.id}`, updatedData);
          await fetchSocios();
        } catch (err) {
          showAlert('Error', 'Error al desactivar al socio.');
          setSocios(socios.map(s => s.id === socio.id ? { ...s, estado: 'INACTIVO'} : s));
        }
      }
    });
  };

  const handleRestoreSocio = (socio) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Reactivar Socio',
      message: `¿Estás seguro de que deseas reactivar a ${socio.nombreCompleto}?`,
      onConfirm: async () => {
        try {
          const updatedData = { ...socio, estado: 'ACTIVO' };
          await api.put(`/socios/${socio.id}`, updatedData);
          await fetchSocios();
        } catch (err) {
          showAlert('Error', 'Error al reactivar al socio.');
          setSocios(socios.map(s => s.id === socio.id ? { ...s, estado: 'ACTIVO'} : s));
        }
      }
    });
  };

  const openModalForNew = () => {
    setEditingId(null);
    setFormData({ nombreCompleto: '', dni: '', ruc: '', razonSocial: '', telefono: '', email: '', fechaNacimiento: '', estado: 'ACTIVO' });
    setShowModal(true);
  };

  const openModalForEdit = (socio) => {
    setEditingId(socio.id);
    setFormData({
      nombreCompleto: socio.nombreCompleto || '',
      dni: socio.dni || '',
      ruc: socio.ruc || '',
      razonSocial: socio.razonSocial || '',
      telefono: socio.telefono || '',
      email: socio.email || '',
      fechaNacimiento: socio.fechaNacimiento ? socio.fechaNacimiento.split('T')[0] : '',
      estado: socio.estado || 'ACTIVO'
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  // Filtrado de Socios (Texto y Estado)
  const filteredSocios = (Array.isArray(socios) ? socios : [])
    .filter(s => {
      if (filterMode === 'ALL') return true;
      return s.estado === filterMode;
    })
    .filter(s => {
      const nombre = s?.nombreCompleto || '';
      const dni = s?.dni || '';
      return nombre.toLowerCase().includes(search.toLowerCase()) || dni.includes(search);
    });

  const duplicateSocio = !editingId ? (socios || []).find(s => s?.dni === formData.dni) : null;
  const isDniDuplicate = !!duplicateSocio;

  const FILTERS = [
    { key: 'ALL', label: 'Todos', count: socios.length },
    { key: 'ACTIVO', label: 'Activos', count: socios.filter(s => s.estado === 'ACTIVO').length, color: '#22c55e' },
    { key: 'INACTIVO', label: 'Inactivos', count: socios.filter(s => s.estado === 'INACTIVO').length, color: '#ef4444' }
  ];

  return (
    <PageLayout
      title={<span>Gestión de <span className="text-gradient">Socios</span></span>}
      subtitle="Lista de todos los miembros registrados en el sistema."
      actionButton={
        <button className="btn-primary" onClick={openModalForNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} /> NUEVO SOCIO
        </button>
      }
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: 3, gap: 3 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilterMode(f.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                background: filterMode === f.key ? (f.color ? `${f.color}20` : 'var(--panel-border)') : 'transparent',
                color: filterMode === f.key ? (f.color || 'var(--text-main)') : 'var(--text-muted)',
                transition: 'all .2s',
              }}>
              {f.label} <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>({f.count})</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o DNI..."
            style={{ paddingLeft: 36, width: '100%', borderRadius: 10, padding: '9px 12px 9px 36px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', outline: 'none' }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando socios...</div>
        ) : filteredSocios.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <User size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No se encontraron socios con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="responsive-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>SOCIO</th>
                <th>DOCUMENTO</th>
                <th>CONTACTO</th>
                <th>ESTADO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredSocios.map(socio => {
                const isActive = socio.estado === 'ACTIVO';
                return (
                  <tr key={socio?.id || Math.random()} style={{ opacity: isActive ? 1 : 0.55 }}>
                    <td data-label="SOCIO">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={socio?.nombreCompleto || 'S'} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {socio?.nombreCompleto || 'Sin nombre'}
                          </div>
                          {socio?.razonSocial && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RS: {socio.razonSocial}</div>}
                        </div>
                      </div>
                    </td>
                    <td data-label="DOCUMENTO" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>DNI: {socio?.dni || 'N/A'}</div>
                      {socio?.ruc && <div>RUC: {socio.ruc}</div>}
                    </td>
                    <td data-label="CONTACTO" style={{ fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--text-main)' }}>📞 {socio?.telefono || 'Sin tel'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>✉️ {socio?.email || 'Sin email'}</div>
                    </td>
                    <td data-label="ESTADO">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                        background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isActive ? '#22c55e' : '#ef4444',
                        border: `1px solid ${isActive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}>
                        {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button onClick={() => openModalForEdit(socio)} title="Editar Socio"
                          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          <Edit size={14} /> Editar
                        </button>
                        {isActive ? (
                          <button onClick={() => handleLogicalDelete(socio)} title="Dar de baja"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                            <Trash2 size={14} /> Baja
                          </button>
                        ) : (
                          <button onClick={() => handleRestoreSocio(socio)} title="Reactivar"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                            <RotateCcw size={14} /> Reactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={editingId ? "Editar Socio" : "Registrar Socio"}
      >
        <form onSubmit={handleRegisterOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>DNI</label>
              <div style={{ position: 'relative' }}>
                <input 
                  required 
                  type="text" 
                  maxLength="8"
                  value={formData.dni} 
                  onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})} 
                  placeholder="8 dígitos"
                  disabled={!!editingId}
                  style={{ 
                    border: isDniDuplicate ? '1px solid #ff3e3e' : '1px solid var(--panel-border)',
                    ...(editingId ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(0,0,0,0.02)' } : {})
                  }}
                />
                {isSearchingDni && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--accent-primary)' }}>Consultando...</div>
                )}
              </div>
              {isDniDuplicate && (
                <div style={{ color: '#ff3e3e', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> DNI ocupado por <strong>{duplicateSocio.nombreCompleto}</strong>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>RUC (Opcional para Factura)</label>
              <input 
                type="text" 
                maxLength="11"
                value={formData.ruc} 
                onChange={e => setFormData({...formData, ruc: e.target.value.replace(/\D/g, '')})} 
                placeholder="11 dígitos"
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Nombre Completo o Razón Social (Factura)</label>
            <input 
              required 
              type="text" 
              value={formData.nombreCompleto}
              onChange={e => setFormData({...formData, nombreCompleto: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')})}
              placeholder="Ej: Juan Pérez"
              disabled={!!editingId}
              style={editingId ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(0,0,0,0.02)' } : {}}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Correo Electrónico</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="usuario@dominio.com"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Teléfono</label>
              <input 
                type="text" 
                maxLength="9"
                placeholder="Ej: 987654321"
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Fecha de Nacimiento</label>
              <input 
                type="date" 
                value={formData.fechaNacimiento}
                onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 12)).toISOString().split('T')[0]}
                min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                disabled={!!editingId}
                style={editingId ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(0,0,0,0.02)' } : {}}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Estado Local</label>
              <select 
                value={formData.estado}
                onChange={e => setFormData({...formData, estado: e.target.value})}
                style={{ 
                  background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', 
                  width: '100%', padding: '12px', borderRadius: '10px', outline: 'none' 
                }}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={closeModal} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isDniDuplicate}
              style={{ flex: 1, opacity: isDniDuplicate ? 0.5 : 1, cursor: isDniDuplicate ? 'not-allowed' : 'pointer' }}
            >
              {editingId ? "ACTUALIZAR SOCIO" : "REGISTRAR SOCIO"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Global Action Modal */}
      <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{dialogConfig.message}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            {dialogConfig.type !== 'alert' && (
              <button onClick={() => setDialogConfig({ isOpen: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)' }}>
                Cancelar
              </button>
            )}
            <button 
              className="btn-primary" 
              onClick={() => {
                if(dialogConfig.type === 'confirm') dialogConfig.onConfirm();
                setDialogConfig({ isOpen: false });
              }} 
              style={{ padding: '10px 24px' }}
            >
              {dialogConfig.type === 'alert' ? 'Aceptar' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div style={{
          position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
          background: toast.type === 'success' ? '#00ff7f' : '#ff3e3e',
          color: '#000', padding: '14px 24px', borderRadius: '12px',
          fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideInUp 0.3s ease'
        }}>
          <CheckCircle size={20} />
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </PageLayout>
  );
};

export default Socios;
