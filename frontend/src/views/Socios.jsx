import React, { useEffect, useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit,
  Trash2,
  AlertCircle,
  Filter,
  RotateCcw
} from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';

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
    telefono: '',
    fechaNacimiento: '',
    estado: 'ACTIVO'
  });
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });

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
          if (response.data && response.data.nombreCompleto) {
            setFormData(prev => ({
              ...prev,
              nombreCompleto: response.data.nombreCompleto
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
    try {
      if (editingId) {
        await api.put(`/socios/${editingId}`, formData);
      } else {
        await api.post('/socios', formData);
      }
      closeModal();
      fetchSocios();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al procesar la solicitud');
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
    setFormData({ nombreCompleto: '', dni: '', telefono: '', fechaNacimiento: '', estado: 'ACTIVO' });
    setShowModal(true);
  };

  const openModalForEdit = (socio) => {
    setEditingId(socio.id);
    setFormData({
      nombreCompleto: socio.nombreCompleto || '',
      dni: socio.dni || '',
      telefono: socio.telefono || '',
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
      <section className="card" style={{ padding: '0 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search 
              size={18} 
              color="var(--text-muted)" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'center' }}>
            <button 
              onClick={() => setFilterMode('ALL')}
              style={{ padding: '8px 16px', background: filterMode === 'ALL' ? 'var(--panel-border)' : 'transparent', color: 'var(--text-main)', borderRadius: '8px' }}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterMode('ACTIVO')}
              style={{ padding: '8px 16px', background: filterMode === 'ACTIVO' ? 'rgba(0, 255, 127, 0.2)' : 'transparent', color: filterMode === 'ACTIVO' ? '#00ff7f' : 'var(--text-main)', borderRadius: '8px' }}
            >
              Activos
            </button>
            <button 
              onClick={() => setFilterMode('INACTIVO')}
              style={{ padding: '8px 16px', background: filterMode === 'INACTIVO' ? 'rgba(255, 62, 62, 0.2)' : 'transparent', color: filterMode === 'INACTIVO' ? '#ff3e3e' : 'var(--text-main)', borderRadius: '8px' }}
            >
              Inactivos
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando socios...</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>SOCIO</th>
                <th>DNI</th>
                <th>TELÉFONO</th>
                <th>ESTADO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredSocios.map(socio => (
                <tr key={socio?.id || Math.random()}>
                  <td data-label="SOCIO" style={{ fontWeight: '600' }}>{socio?.nombreCompleto || 'Sin nombre'}</td>
                  <td data-label="DNI" style={{ color: 'var(--text-muted)' }}>{socio?.dni || 'N/A'}</td>
                  <td data-label="TELÉFONO">{socio?.telefono || 'Sin datos'}</td>
                  <td data-label="ESTADO">
                    <span className={`badge ${socio?.estado === 'ACTIVO' ? 'badge-active' : 'badge-inactive'}`}>
                      {socio?.estado || 'DESCONOCIDO'}
                    </span>
                  </td>
                  <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => openModalForEdit(socio)} 
                        title="Editar Socio"
                        style={{ background: 'transparent', color: 'var(--text-main)', padding: '8px' }}
                      >
                        <Edit size={16} />
                      </button>
                      {socio.estado === 'ACTIVO' ? (
                        <button 
                          onClick={() => handleLogicalDelete(socio)} 
                          title="Dar de baja"
                          style={{ background: 'transparent', color: '#ff3e3e', padding: '8px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRestoreSocio(socio)} 
                          title="Reactivar"
                          style={{ background: 'transparent', color: '#00ff7f', padding: '8px' }}
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSocios.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron socios con este criterio.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={editingId ? "Editar Socio" : "Registrar Socio"}
      >
        <form onSubmit={handleRegisterOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Nombre Completo</label>
            <input 
              required 
              type="text" 
              value={formData.nombreCompleto}
              onChange={e => setFormData({...formData, nombreCompleto: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
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
                  style={{ border: isDniDuplicate ? '1px solid #ff3e3e' : '1px solid var(--panel-border)' }}
                  readOnly={!!editingId} // DNI no se debería poder editar si es la clave, o quizás sí, pero readOnly previene fallos.
                />
                {isSearchingDni && (
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--accent-primary)' }}>Consultando...</div>
                )}
              </div>
              {isDniDuplicate && (
                <div style={{ color: '#ff3e3e', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} /> Este DNI ya pertenece a <strong>{duplicateSocio.nombreCompleto}</strong>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Teléfono</label>
              <input 
                type="text" 
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value})}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Fecha de Nacimiento</label>
              <input 
                type="date" 
                value={formData.fechaNacimiento}
                onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})}
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
    </PageLayout>
  );
};

export default Socios;
