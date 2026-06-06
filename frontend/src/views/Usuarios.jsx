import React, { useState, useEffect } from 'react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';
import { Users, Plus, Shield, UserX, User, RotateCcw, Edit, Search, CheckCircle, XCircle, Lock, Eye, EyeOff } from 'lucide-react';

const ROL_CONFIG = {
  ADMINISTRADOR: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: <Shield size={13} />, label: 'Administrador' },
  RECEPCIONISTA: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <User size={13} />, label: 'Recepcionista' },
};

const Avatar = ({ name, rol }) => {
  const initials = name ? name.slice(0, 2).toUpperCase() : '??';
  const cfg = ROL_CONFIG[rol] || ROL_CONFIG.RECEPCIONISTA;
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: cfg.bg, border: `2px solid ${cfg.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: '1rem', color: cfg.color, flexShrink: 0,
    }}>{initials}</div>
  );
};

const StatCard = ({ value, label, color, icon }) => (
  <div style={{
    background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
    borderRadius: 14, padding: '18px 22px',
    display: 'flex', alignItems: 'center', gap: 14,
  }}>
    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
    <div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
    </div>
  </div>
);

const validate = (formData, editingId) => {
  if (!formData.username.trim()) return 'El nombre de usuario es obligatorio.';
  if (formData.username.length < 4) return 'El usuario debe tener al menos 4 caracteres.';
  if (!/^[a-z0-9._]+$/.test(formData.username)) return 'Solo letras minúsculas, números, puntos y guiones bajos.';
  
  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (pwd.includes(' ')) return 'La contraseña no puede tener espacios.';
    if (!/[A-Z]/.test(pwd)) return 'La contraseña debe contener al menos una letra mayúscula.';
    if (!/[a-z]/.test(pwd)) return 'La contraseña debe contener al menos una letra minúscula.';
    if (!/\d/.test(pwd)) return 'La contraseña debe contener al menos un número.';
    if (!/[@$!%*?&._\-]/.test(pwd)) return 'La contraseña debe contener al menos un carácter especial (@$!%*?&._-).';
    return null;
  };

  if (!editingId) {
    if (!formData.password) return 'La contraseña es obligatoria.';
    const passErr = validatePassword(formData.password);
    if (passErr) return passErr;
  } else if (formData.password && formData.password !== '********') {
    const passErr = validatePassword(formData.password);
    if (passErr) return passErr;
  }
  return null;
};

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', rol: 'RECEPCIONISTA', activo: true });
  const [errorMSG, setErrorMSG] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const currentUser = localStorage.getItem('username');

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const fetchData = async () => {
    setLoading(true);
    try { const r = await api.get('/usuarios'); setUsuarios(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', rol: 'RECEPCIONISTA', activo: true });
    setErrorMSG(''); setShowPass(false); setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setFormData({ username: u.username, password: '********', rol: u.rol, activo: u.activo });
    setErrorMSG(''); setShowPass(false); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(formData, editingId);
    if (err) { setErrorMSG(err); return; }
    if (editingId && !formData.activo && currentUser?.toLowerCase() === formData.username.toLowerCase()) {
      setErrorMSG('No puedes desactivar tu propia cuenta mientras tienes sesión activa.'); return;
    }
    setSaving(true); setErrorMSG('');
    try {
      if (editingId) await api.put(`/usuarios/${editingId}`, formData);
      else await api.post('/usuarios', formData);
      setShowModal(false); fetchData();
    } catch (e) {
      setErrorMSG(e.response?.data || 'Error al guardar. Verifica los datos e intenta nuevamente.');
    } finally { setSaving(false); }
  };

  const handleToggleActivo = (u) => {
    if (u.rol === 'ADMINISTRADOR') { showAlert('Acción Restringida', 'Por políticas de seguridad no es posible desactivar a un usuario con rol ADMINISTRADOR.'); return; }
    if (currentUser?.toLowerCase() === u.username.toLowerCase()) { showAlert('Acción Denegada', 'No puedes desactivar tu propia cuenta mientras tienes una sesión activa.'); return; }
    const accion = u.activo !== false ? 'desactivar' : 'activar';
    setDialogConfig({
      isOpen: true, type: 'confirm',
      title: u.activo !== false ? 'Desactivar Acceso' : 'Reactivar Acceso',
      message: `¿Confirmas que deseas ${accion} el acceso de "${u.username}"?`,
      variant: u.activo !== false ? 'danger' : 'success',
      onConfirm: async () => {
        try { await api.put(`/usuarios/${u.id}`, { ...u, activo: !u.activo }); fetchData(); }
        catch (e) { showAlert('Error', e.response?.data || 'No se pudo completar la acción.'); }
      }
    });
  };

  const handleResetPassword = (u) => {
    setDialogConfig({
      isOpen: true, type: 'confirm',
      title: 'Restablecer Contraseña',
      message: `Se restablecerá la contraseña de "${u.username}". Deberás ingresar una nueva contraseña en el formulario de edición.`,
      onConfirm: () => openEdit(u),
    });
  };

  const filtered = usuarios.filter(u => {
    const matchFilter = filterMode === 'ALL' || (filterMode === 'ACTIVO' ? u.activo !== false : u.activo === false);
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.rol.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalActivos = usuarios.filter(u => u.activo !== false).length;
  const totalAdmins = usuarios.filter(u => u.rol === 'ADMINISTRADOR').length;
  const totalRecep = usuarios.filter(u => u.rol === 'RECEPCIONISTA').length;

  const FILTERS = [
    { key: 'ALL', label: 'Todos', count: usuarios.length },
    { key: 'ACTIVO', label: 'Activos', count: totalActivos, color: '#22c55e' },
    { key: 'INACTIVO', label: 'Inactivos', count: usuarios.length - totalActivos, color: '#ef4444' },
  ];

  return (
    <PageLayout
      title={<span>Gestión de <span className="text-gradient">Personal</span></span>}
      subtitle="Administra los accesos al sistema del equipo operativo del gimnasio."
      actionButton={
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Nuevo Usuario
        </button>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard value={usuarios.length} label="Total de usuarios" color="#a78bfa" icon={<Users size={20} />} />
        <StatCard value={totalActivos} label="Activos" color="#22c55e" icon={<CheckCircle size={20} />} />
        <StatCard value={totalAdmins} label="Administradores" color="#3b82f6" icon={<Shield size={20} />} />
        <StatCard value={totalRecep} label="Recepcionistas" color="#f59e0b" icon={<User size={20} />} />
      </div>

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
            placeholder="Buscar por usuario o rol..."
            style={{ paddingLeft: 36, width: '100%', borderRadius: 10, padding: '9px 12px 9px 36px' }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando personal...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p>No se encontraron usuarios con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="responsive-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>USUARIO</th>
                <th>ROL</th>
                <th>ESTADO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const cfg = ROL_CONFIG[u.rol] || ROL_CONFIG.RECEPCIONISTA;
                const isMe = currentUser?.toLowerCase() === u.username.toLowerCase();
                const isActive = u.activo !== false;
                return (
                  <tr key={u.id} style={{ opacity: isActive ? 1 : 0.55 }}>
                    <td data-label="USUARIO">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={u.username} rol={u.rol} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {u.username}
                            {isMe && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'rgba(167,139,250,0.2)', color: '#a78bfa', padding: '2px 7px', borderRadius: 20, verticalAlign: 'middle' }}>Tú</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="ROL">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.8rem', border: `1px solid ${cfg.color}30` }}>
                        {cfg.icon} {cfg.label}
                      </span>
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
                        {/* Editar */}
                        <button onClick={() => openEdit(u)} title="Editar usuario"
                          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          <Edit size={14} /> Editar
                        </button>
                        {/* Reset contraseña */}
                        <button onClick={() => handleResetPassword(u)} title="Cambiar contraseña"
                          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          <Lock size={14} />
                        </button>
                        {/* Activar / Desactivar */}
                        {isActive ? (
                          <button onClick={() => handleToggleActivo(u)} title="Desactivar acceso"
                            disabled={u.rol === 'ADMINISTRADOR' || isMe}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, padding: '6px 10px', cursor: (u.rol === 'ADMINISTRADOR' || isMe) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600, opacity: (u.rol === 'ADMINISTRADOR' || isMe) ? 0.35 : 1 }}>
                            <UserX size={14} /> Desactivar
                          </button>
                        ) : (
                          <button onClick={() => handleToggleActivo(u)} title="Reactivar acceso"
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

      {/* Modal Crear/Editar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Usuario' : 'Nuevo Usuario del Sistema'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMSG && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 10, fontSize: '0.88rem', borderLeft: '3px solid #ef4444' }}>
              ⚠ {errorMSG}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Nombre de Usuario <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input required type="text" value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '') })}
              placeholder="Ej: maria.recepcion"
              style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Contraseña {!editingId && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                required={!editingId}
                type={showPass ? 'text' : 'password'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingId ? "Dejar '********' para no cambiar" : 'Mín. 8 caracteres, letras, números y símbolos'}
                style={{ width: '100%', paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="responsive-form-grid" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Rol del Sistema</label>
              <select value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}
                disabled={!!editingId}
                style={{ 
                  width: '100%', padding: '11px 12px', background: 'var(--panel-bg)', 
                  color: 'var(--text-main)', borderRadius: 12, border: '1px solid var(--panel-border)',
                  cursor: editingId ? 'not-allowed' : 'pointer',
                  opacity: editingId ? 0.6 : 1
                }}>
                <option value="RECEPCIONISTA">Recepcionista</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </div>
            {editingId && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>Estado</label>
                <select value={formData.activo}
                  onChange={e => setFormData({ ...formData, activo: e.target.value === 'true' })}
                  disabled={formData.rol === 'ADMINISTRADOR'}
                  style={{ 
                    width: '100%', padding: '11px 12px', background: 'var(--panel-bg)', 
                    color: 'var(--text-main)', borderRadius: 12, border: '1px solid var(--panel-border)',
                    cursor: formData.rol === 'ADMINISTRADOR' ? 'not-allowed' : 'pointer',
                    opacity: formData.rol === 'ADMINISTRADOR' ? 0.6 : 1
                  }}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Descripción del rol */}
          <div style={{ padding: '10px 14px', background: 'rgba(167,139,250,0.07)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '3px solid rgba(167,139,250,0.4)' }}>
            {formData.rol === 'ADMINISTRADOR'
              ? '🛡 Acceso total: reportes, gestión de personal, configuración del sistema y operaciones.'
              : '📋 Acceso operativo: registro de socios, ventas, suscripciones y atención al cliente.'}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setShowModal(false)}
              style={{ flex: 1, padding: '11px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? 'Guardando...' : (editingId ? '✓ Actualizar Usuario' : '+ Crear Usuario')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dialog de confirmación/alerta */}
      <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>{dialogConfig.message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {dialogConfig.type !== 'alert' && (
              <button onClick={() => setDialogConfig({ isOpen: false })}
                style={{ padding: '9px 20px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                Cancelar
              </button>
            )}
            <button className={dialogConfig.variant === 'danger' ? '' : 'btn-primary'}
              onClick={() => { if (dialogConfig.type === 'confirm') dialogConfig.onConfirm(); setDialogConfig({ isOpen: false }); }}
              style={dialogConfig.variant === 'danger' ? { padding: '9px 22px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 } : { padding: '9px 22px' }}>
              {dialogConfig.type === 'alert' ? 'Entendido' : 'Confirmar'}
            </button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default Usuarios;
