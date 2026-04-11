import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Snowflake,
  MoreVertical,
  Trash2,
  Play,
  DollarSign,
  XCircle
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';

const Membresias = () => {
  const [activeTab, setActiveTab] = useState('suscripciones');
  const [suscripciones, setSuscripciones] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todas');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSusModal, setShowSusModal] = useState(false);
  const [socios, setSocios] = useState([]);
  const [socioSearch, setSocioSearch] = useState('');
  const [showSocioList, setShowSocioList] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const role = localStorage.getItem('role');
  
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [promptValue, setPromptValue] = useState("");

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const [planFormData, setPlanFormData] = useState({
    nombre: '',
    precio: '',
    precioMensual: '',
    duracionDias: '',
    descripcion: '',
    estado: 'DISPONIBLE'
  });

  const [susFormData, setSusFormData] = useState({
    socioId: '',
    membresiaId: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    estadoPago: 'PAGADO'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suscResp, membResp, socioResp] = await Promise.all([
        api.get('/suscripciones'),
        api.get('/membresias'),
        api.get('/socios')
      ]);
      setSuscripciones(suscResp.data);
      setMembresias(membResp.data);
      setSocios(socioResp.data);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSus = (id) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Eliminar Suscripción',
      message: '¿Estás seguro de eliminar esta suscripción? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await api.delete(`/suscripciones/${id}`);
          fetchData();
          setActiveMenuId(null);
        } catch (err) {
          showAlert('Error', 'Error al eliminar la suscripción');
        }
      }
    });
  };

  const handleDescongelar = (id) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Descongelar Suscripción',
      message: '¿Deseas descongelar esta suscripción ahora?',
      onConfirm: async () => {
        try {
          await api.post(`/suscripciones/${id}/descongelar`);
          fetchData();
        } catch (err) {
          showAlert('Error', 'Error al descongelar la suscripción');
        }
      }
    });
  };

  const handleRegistrarCobro = (sus) => {
    let montoPredefinido = sus.membresia.precioMensual || sus.membresia.precio;
    const processCobro = async (monto) => {
      try {
        await api.post(`/pagos/suscripcion/${sus.id}`, {
          monto: parseFloat(monto),
          metodoPago: 'EFECTIVO',
          fechaPago: new Date().toISOString()
        });
        showAlert("Éxito", "¡Cobro realizado con éxito!");
        fetchData();
      } catch (err) {
        showAlert("Error", "Error al registrar el pago");
      }
    };

    if (!montoPredefinido || montoPredefinido === 0) {
      setPromptValue("0");
      setDialogConfig({
        isOpen: true, type: 'prompt', title: `Cobro para ${sus.socio.nombreCompleto}`,
        message: 'Ingrese el monto a cobrar:',
        onConfirm: (val) => { if (val && !isNaN(val)) processCobro(val); }
      });
    } else {
      setDialogConfig({
        isOpen: true, type: 'confirm', title: 'Confirmar Cobro',
        message: `¿Confirmar cobro de S/ ${montoPredefinido} para ${sus.socio.nombreCompleto}?`,
        onConfirm: () => processCobro(montoPredefinido)
      });
    }
  };

  useEffect(() => {
    fetchData();
    const closeMenus = () => setActiveMenuId(null);
    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      if (editingPlanId) {
        await api.put(`/membresias/${editingPlanId}`, planFormData);
      } else {
        await api.post('/membresias', planFormData);
      }
      setShowPlanModal(false);
      fetchData();
      setPlanFormData({ nombre: '', precio: '', precioMensual: '', duracionDias: '', descripcion: '', estado: 'DISPONIBLE' });
      setEditingPlanId(null);
    } catch (err) {
      showAlert("Error", "Error al guardar plan");
    }
  };

  const handleArchivePlan = (plan) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Archivar Plan',
      message: `¿Deseas archivar el plan "${plan.nombre}"? Dejará de salir en futuras ventas.`,
      onConfirm: async () => {
        try {
          await api.put(`/membresias/${plan.id}`, { ...plan, estado: 'INACTIVO' });
          fetchData();
        } catch (err) {
          showAlert("Error", "Error al archivar plan");
        }
      }
    });
  };

  const handleCreateSus = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suscripciones', susFormData);
      setShowSusModal(false);
      setSocioSearch('');
      fetchData();
    } catch (err) {
      showAlert("Error", "Error al registrar suscripción");
    }
  };

  const handleRenovar = (id) => {
    if (!id) return;
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Renovación Rápida',
      message: '¿Deseas realizar una renovación rápida para este socio?',
      onConfirm: async () => {
        try {
          await api.post(`/suscripciones/${id}/renovar`);
          fetchData();
        } catch (err) {
          showAlert("Error", "Error al renovar");
        }
      }
    });
  };

  const handleCongelar = (id) => {
    if (!id) return;
    setPromptValue("");
    setDialogConfig({
      isOpen: true, type: 'prompt', title: 'Congelar Suscripción',
      message: '¿Cuántos días deseas congelar?',
      onConfirm: async (dias) => {
        if (dias && !isNaN(dias)) {
          try {
            const hoy = new Date().toISOString().split('T')[0];
            const fin = new Date();
            fin.setDate(fin.getDate() + parseInt(dias));
            await api.post(`/suscripciones/${id}/congelar`, {
              fechaInicio: hoy,
              fechaFin: fin.toISOString().split('T')[0],
              motivo: "Congelamiento manual"
            });
            fetchData();
          } catch (err) {
            showAlert("Error", "Error al congelar");
          }
        }
      }
    });
  };

  const filteredSuscripciones = (Array.isArray(suscripciones) ? suscripciones : []).filter(s => {
    if (!s || !s.socio) return false;
    const matchSearch = (s.socio.nombreCompleto || '').toLowerCase().includes(search.toLowerCase()) || (s.socio.dni || '').includes(search);
    const hoy = new Date();
    const dif = Math.ceil((new Date(s.fechaFin || new Date()) - hoy) / (1000 * 60 * 60 * 24));
    if (filter === 'semana') return matchSearch && dif >= 0 && dif <= 7;
    if (filter === 'vencidas') return matchSearch && dif < 0;
    return matchSearch;
  });

  const filteredSociosForModal = (Array.isArray(socios) ? socios : []).filter(s => 
    s && (s.nombreCompleto.toLowerCase().includes(socioSearch.toLowerCase()) || s.dni.includes(socioSearch))
  );

  const selectedSocio = (socios || []).find(s => s?.id?.toString() === susFormData.socioId?.toString());
  const socioHasActiveSub = (suscripciones || []).some(s => 
    s?.socio?.id?.toString() === susFormData.socioId?.toString() && 
    !s.estaCongelada && 
    (s.fechaFin ? new Date(s.fechaFin) >= new Date() : true) && 
    s.estadoPago === 'PAGADO'
  );

  const getEstadoBadge = (s) => {
    if (!s) return null;
    if (s.estaCongelada) return <span className="badge" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>CONGELADA</span>;
    if (!s.fechaFin) return <span className="badge badge-active">ACTIVO</span>;
    if (new Date(s.fechaFin) < new Date()) return <span className="badge badge-inactive">VENCIDO</span>;
    return <span className="badge badge-active">ACTIVO</span>;
  };

  return (
    <PageLayout
      title={<span>Gestión de <span className="text-gradient">Membresías</span></span>}
      subtitle="Control de socios activos y configuración de planes comerciales."
      actionButton={
        <div className="tabs-container" style={{ display: 'flex', background: 'var(--panel-bg)', padding: '6px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setActiveTab('suscripciones')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'suscripciones' ? 'rgba(255, 62, 62, 0.1)' : 'transparent',
              color: activeTab === 'suscripciones' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: '600', transition: '0.3s'
            }}
          >
            <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Suscripciones
          </button>
          <button 
            onClick={() => setActiveTab('catalogo')}
            style={{ 
              padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'catalogo' ? 'rgba(255, 62, 62, 0.1)' : 'transparent',
              color: activeTab === 'catalogo' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: '600', transition: '0.3s'
            }}
          >
            <Settings size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Catálogo de Planes
          </button>
        </div>
      }
    >
      {activeTab === 'suscripciones' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto' }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar socio o DNI..." 
                  style={{ paddingLeft: '40px', width: '100%', color: 'var(--text-main)', background: 'var(--panel-bg)' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', flex: '1 1 auto' }}
              >
                <option value="todas">Todas las suscripciones</option>
                <option value="semana">Vencen esta semana</option>
                <option value="vencidas">Ya vencidas</option>
              </select>
            </div>
            <button className="btn-primary" onClick={() => setShowSusModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} /> VENDER PLAN
            </button>
          </div>

          <div className="card" style={{ padding: '0 24px 24px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos operativos...</div>
            ) : (
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>SOCIO</th>
                    <th>PLAN</th>
                    <th>INICIO</th>
                    <th>PRÓXIMO COBRO</th>
                    <th>VENCIMIENTO</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuscripciones.map(s => (
                    <tr key={s?.id || Math.random()}>
                      <td data-label="SOCIO">
                        <div style={{ fontWeight: '600' }}>{s?.socio?.nombreCompleto || 'Socio desconocido'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DNI: {s?.socio?.dni || 'N/A'}</div>
                      </td>
                      <td data-label="PLAN">{s?.membresia?.nombre || 'Plan desconocido'}</td>
                      <td data-label="INICIO">{s?.fechaInicio || '-'}</td>
                      <td data-label="PRÓXIMO COBRO" style={{ color: s.fechaProximoCobro && new Date(s.fechaProximoCobro) < new Date() ? '#ff3e3e' : 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          {s.fechaProximoCobro ? s.fechaProximoCobro : '-'}
                          {s.fechaProximoCobro && new Date(s.fechaProximoCobro) < new Date() && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#ff3e3e' }}>¡DEUDA!</span>
                          )}
                      </td>
                      <td data-label="VENCIMIENTO">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          {s?.fechaFin || '-'}
                        </div>
                      </td>
                      <td data-label="ESTADO">{getEstadoBadge(s)}</td>
                      <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleRegistrarCobro(s); }} style={{ background: 'rgba(255, 193, 7, 0.1)', color: 'var(--accent-secondary)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <DollarSign size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleRenovar(s?.id); }} style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <RefreshCw size={18} />
                          </button>
                          {s?.estaCongelada ? (
                            <button onClick={(e) => { e.stopPropagation(); handleDescongelar(s?.id); }} style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                              <Play size={18} />
                            </button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleCongelar(s?.id); }} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                              <Snowflake size={18} />
                            </button>
                          )}
                          <div style={{ position: 'relative' }}>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s?.id ? null : s?.id); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '8px' }}>
                              <MoreVertical size={20} />
                            </button>
                            {activeMenuId === s?.id && (
                              <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1200, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSus(s?.id); }} style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: 'var(--accent-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Trash2 size={16} /> ELIMINAR
                                </button>
                                <button onClick={() => setActiveMenuId(null)} style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--panel-border)' }}>
                                  <XCircle size={16} /> CANCELAR
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Configura los planes y precios que ofreces al público.</h3>
            {role === 'ADMINISTRADOR' && (
              <button className="btn-primary" onClick={() => { setEditingPlanId(null); setPlanFormData({ nombre: '', precio: '', precioMensual: '', duracionDias: '', descripcion: '', estado: 'DISPONIBLE' }); setShowPlanModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} /> CREAR NUEVO PLAN
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {(membresias || []).filter(m => m).map(m => (
              <div key={m.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{m.nombre}</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-primary)' }}>S/ {m.precio}</span>
                    {m.precioMensual && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>(S/ {m.precioMensual}/mes)</span>
                    )}
                  </div>
                  <span className="badge" style={{ 
                    background: (!m.estado || m.estado === 'DISPONIBLE') ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 255, 255, 0.1)', 
                    color: (!m.estado || m.estado === 'DISPONIBLE') ? '#00ff7f' : 'var(--text-muted)' 
                  }}>
                    {m.estado || 'DISPONIBLE'}
                  </span>
                </div>
                
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>S/ {m.precio}</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Duración: {m.duracionDias} días
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', minHeight: '40px' }}>{m.descripcion || "Sin descripción detallada."}</p>

                {role === 'ADMINISTRADOR' && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '12px' }}>
                    <button onClick={() => { setEditingPlanId(m.id); setPlanFormData(m); setShowPlanModal(true); }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '10px', color: 'var(--text-main)' }}>Editar</button>
                    <button onClick={() => handleArchivePlan(m)} style={{ flex: 1, padding: '10px', background: 'rgba(255, 62, 62, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--accent-primary)' }}>Archivar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modales refactorizados usando nuestro Modal Global (agnóstico al dark mode) */}
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlanId ? "Editar Plan" : "Crear Nuevo Plan"}>
        <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Plan</label>
            <input required type="text" value={planFormData.nombre} onChange={e => setPlanFormData({...planFormData, nombre: e.target.value})} placeholder="Ej: Mensualidad Estándar" />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Precio Total (S/)</label>
              <input required type="number" step="0.01" value={planFormData.precio} onChange={e => setPlanFormData({...planFormData, precio: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Costo Mensual (Opt S/)</label>
              <input type="number" step="0.01" value={planFormData.precioMensual} onChange={e => setPlanFormData({...planFormData, precioMensual: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Duración (Días)</label>
              <input required type="number" value={planFormData.duracionDias} onChange={e => setPlanFormData({...planFormData, duracionDias: e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Descripción</label>
            <textarea rows="3" value={planFormData.descripcion} onChange={e => setPlanFormData({...planFormData, descripcion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => setShowPlanModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>GUARDAR PLAN</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showSusModal} onClose={() => { setShowSusModal(false); setSocioSearch(''); }} title="Vender Plan / Suscripción">
        <form onSubmit={handleCreateSus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Buscar Socio (Nombre o DNI)</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Ej: 72312470 o Salas Bances..." 
                value={socioSearch}
                onChange={e => { setSocioSearch(e.target.value); setShowSocioList(true); }}
                onFocus={() => setShowSocioList(true)}
                style={{ paddingLeft: '40px', width: '100%', marginBottom: '8px' }}
              />
            </div>
            {showSocioList && socioSearch.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                {filteredSociosForModal.length > 0 ? (
                  filteredSociosForModal.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setSusFormData({...susFormData, socioId: s.id.toString()}); setSocioSearch(s.nombreCompleto); setShowSocioList(false); }}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{s.nombreCompleto}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DNI: {s.dni}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No se encontraron socios</div>
                )}
              </div>
            )}
            
            {selectedSocio && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: socioHasActiveSub ? 'rgba(255, 62, 62, 0.05)' : 'rgba(0, 255, 127, 0.05)', border: socioHasActiveSub ? '1px solid rgba(255, 62, 62, 0.2)' : '1px solid rgba(0, 255, 127, 0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: socioHasActiveSub ? '#ff3e3e' : '#00ff7f', fontWeight: 'bold' }}>
                    {socioHasActiveSub ? '¡Conflicto!' : 'Seleccionado:'}
                  </span> {selectedSocio.nombreCompleto}
                </div>
                <button type="button" onClick={() => { setSusFormData({...susFormData, socioId: ''}); setSocioSearch(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>Cambiar</button>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Plan a Contratar</label>
            <select required value={susFormData.membresiaId} onChange={e => setSusFormData({...susFormData, membresiaId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}>
              <option value="" style={{ background: 'var(--bg-color)' }}>Seleccione un plan...</option>
              {(membresias || []).filter(m => m && (!m.estado || m.estado === 'DISPONIBLE')).map(m => <option key={m.id} value={m.id} style={{ background: 'var(--bg-color)' }}>{m.nombre} - S/ {m.precio}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Fecha de Inicio</label>
            <input type="date" value={susFormData.fechaInicio} onChange={e => setSusFormData({...susFormData, fechaInicio: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => { setShowSusModal(false); setSocioSearch(''); }} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" disabled={socioHasActiveSub || !susFormData.socioId || !susFormData.membresiaId} style={{ flex: 1, opacity: (socioHasActiveSub || !susFormData.socioId || !susFormData.membresiaId) ? 0.5 : 1 }}>
              REGISTRAR VENTA
            </button>
          </div>
        </form>
      </Modal>

      {/* Global Action Modal for Alerts, Confirms, and Prompts */}
      <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{dialogConfig.message}</p>
          
          {dialogConfig.type === 'prompt' && (
            <input 
              type="text" 
              value={promptValue} 
              autoFocus
              onChange={(e) => setPromptValue(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}
              onKeyDown={(e) => {
                if(e.key === 'Enter') {
                  e.preventDefault();
                  dialogConfig.onConfirm && dialogConfig.onConfirm(promptValue);
                  setDialogConfig({ isOpen: false });
                }
              }}
            />
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
            {dialogConfig.type !== 'alert' && (
              <button onClick={() => setDialogConfig({ isOpen: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)' }}>
                Cancelar
              </button>
            )}
            <button 
              className="btn-primary" 
              onClick={() => {
                if(dialogConfig.type === 'prompt') {
                  dialogConfig.onConfirm && dialogConfig.onConfirm(promptValue);
                } else if(dialogConfig.type === 'confirm') {
                  dialogConfig.onConfirm && dialogConfig.onConfirm();
                }
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

export default Membresias;
