import React, { useState, useEffect } from 'react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';
import { Users, Plus, Shield, UserX, User, RotateCcw } from 'lucide-react';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', rol: 'RECEPCIONISTA' });
  const [errorMSG, setErrorMSG] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');

  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/usuarios');
      setUsuarios(resp.data);
    } catch (err) {
      console.error("Error consultando usuarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUsuario = async (e) => {
    e.preventDefault();
    try {
      await api.post('/usuarios', formData);
      setShowModal(false);
      setFormData({ username: '', password: '', rol: 'RECEPCIONISTA' });
      setErrorMSG('');
      fetchData();
    } catch (err) {
      if (err.response && err.response.data) {
        setErrorMSG(typeof err.response.data === 'string' ? err.response.data : 'Error al guardar el usuario');
      } else {
        setErrorMSG('Error de conexión');
      }
    }
  };

  const handleDeleteUsuario = (id, username) => {
    if (username.toLowerCase() === 'admin') {
      showAlert('Acción denegada', 'El administrador principal no puede ser eliminado del sistema por razones de seguridad.');
      return;
    }

    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Eliminar Usuario',
      message: `¿Estás seguro que deseas eliminar el acceso a "${username}"? Esto no se puede deshacer.`,
      onConfirm: async () => {
        try {
          const userToArchive = usuarios.find(u => u.id === id);
          await api.put(`/usuarios/${id}`, { ...userToArchive, activo: false });
          await fetchData();
        } catch (err) {
          showAlert('Error', err.response?.data || 'Error al desactivar acceso');
        }
      }
    });
  };

  const handleRestoreUsuario = (user) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Activar Acceso',
      message: `¿Estás seguro que deseas restaurar el acceso a "${user.username}"?`,
      onConfirm: async () => {
        try {
          await api.put(`/usuarios/${user.id}`, { ...user, activo: true });
          await fetchData();
        } catch (err) {
          showAlert('Error', err.response?.data || 'Error al reactivar acceso');
        }
      }
    });
  };

  return (
    <PageLayout
      title={<span>Gestión de <span className="text-gradient">Personal</span></span>}
      subtitle="Administra los accesos de tus recepcionistas y personal operativo."
      actionButton={
        <button className="btn-primary" onClick={() => { setFormData({ username: '', password: '', rol: 'RECEPCIONISTA' }); setErrorMSG(''); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} /> NUEVO USUARIO
        </button>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)', flexWrap: 'wrap' }}>
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

      <div className="card" style={{ padding: '0 24px 24px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>USUARIO (LOGIN)</th>
                <th>ROL</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.filter(u => {
                if (filterMode === 'ACTIVO') return u.activo !== false;
                if (filterMode === 'INACTIVO') return u.activo === false;
                return true;
              }).map(u => (
                <tr key={u.id}>
                  <td data-label="ID">{u.id}</td>
                  <td data-label="USUARIO (LOGIN)" style={{ fontWeight: 'bold' }}>{u.username}</td>
                  <td data-label="ROL">
                    <span className="badge" style={{
                      background: u.rol === 'ADMINISTRADOR' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 255, 127, 0.1)',
                      color: u.rol === 'ADMINISTRADOR' ? '#3b82f6' : '#00ff7f',
                      border: `1px solid ${u.rol === 'ADMINISTRADOR' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 255, 127, 0.2)'}`
                    }}>
                      {u.rol === 'ADMINISTRADOR' ? <Shield size={12} style={{marginRight:'4px'}}/> : <User size={12} style={{marginRight:'4px'}}/>}
                      {u.rol}
                    </span>
                  </td>
                  <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                    {u.activo !== false ? (
                      <button 
                        onClick={() => handleDeleteUsuario(u.id, u.username)} 
                        style={{ background: 'transparent', border: 'none', color: '#ff3e3e', cursor: 'pointer', padding: '8px', opacity: u.username.toLowerCase() === 'admin' ? 0.3 : 1 }}
                        title="Eliminar Acceso"
                      >
                        <UserX size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleRestoreUsuario(u)} 
                        style={{ background: 'transparent', border: 'none', color: '#00ff7f', cursor: 'pointer', padding: '8px' }}
                        title="Reactivar Acceso"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo Accesoo al Sistema">
        <form onSubmit={handleCreateUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMSG && <div style={{ padding: '10px', background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>{errorMSG}</div>}
          
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre de Usuario</label>
            <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} placeholder="Ej: maria.recepcion" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Contraseña</label>
            <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Segura y sin espacios" />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Asignar Rol</label>
            <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <option value="RECEPCIONISTA">RECEPCIONISTA (Ventas, Socios, Asistencia)</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR (Acceso Total)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>CREAR ACCESO</button>
          </div>
        </form>
      </Modal>

      {/* Global Dialog */}
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

export default Usuarios;
