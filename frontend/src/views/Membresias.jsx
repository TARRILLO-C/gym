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
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  Play,
  DollarSign
} from 'lucide-react';
import api from '../services/api';

const Membresias = () => {
  const [activeTab, setActiveTab] = useState('suscripciones');
  const [suscripciones, setSuscripciones] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todas'); // todas, semana, vencidas
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSusModal, setShowSusModal] = useState(false);
  const [socios, setSocios] = useState([]);
  const [socioSearch, setSocioSearch] = useState('');
  const [showSocioList, setShowSocioList] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

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

  const handleDeleteSus = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta suscripción? Esta acción no se puede deshacer.")) {
      try {
        await api.delete(`/suscripciones/${id}`);
        fetchData();
        setActiveMenuId(null);
      } catch (err) {
        console.error("Error al eliminar:", err);
        alert("Error al eliminar la suscripción");
      }
    }
  };

  const handleDescongelar = async (id) => {
    if (window.confirm("¿Deseas descongelar esta suscripción ahora?")) {
      try {
        await api.post(`/suscripciones/${id}/descongelar`);
        fetchData();
      } catch (err) {
        console.error("Error al descongelar:", err);
        alert("Error al descongelar la suscripción");
      }
    }
  };

  const handleRegistrarCobro = async (sus) => {
    let montoPredefinido = sus.membresia.precioMensual || sus.membresia.precio;
    
    // Si no hay monto predefinido (planes antiguos), solicitamos uno
    if (!montoPredefinido || montoPredefinido === 0) {
      montoPredefinido = prompt(`Registrar cobro para ${sus.socio.nombreCompleto}\nIngrese el monto:`, "0");
      if (!montoPredefinido || isNaN(montoPredefinido)) return;
    } else {
      if (!window.confirm(`¿Confirmar cobro de S/ ${montoPredefinido} para ${sus.socio.nombreCompleto}?`)) return;
    }

    try {
      await api.post(`/pagos/suscripcion/${sus.id}`, {
        monto: parseFloat(montoPredefinido),
        metodoPago: 'EFECTIVO',
        fechaPago: new Date().toISOString()
      });
      alert("¡Cobro realizado con éxito! Acceso habilitado.");
      fetchData();
    } catch (err) {
      console.error("Error al registrar pago:", err);
      alert("Error al registrar el pago");
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
      await api.post('/membresias', planFormData);
      setShowPlanModal(false);
      fetchData();
      setPlanFormData({ nombre: '', precio: '', precioMensual: '', duracionDias: '', descripcion: '', estado: 'DISPONIBLE' });
    } catch (err) {
      alert("Error al crear plan");
    }
  };

  const handleCreateSus = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suscripciones', susFormData);
      setShowSusModal(false);
      setSocioSearch('');
      fetchData();
    } catch (err) {
      alert("Error al registrar suscripción");
    }
  };

  const handleRenovar = async (id) => {
    if (!id) return alert("ID de suscripción no válido");
    
    if (window.confirm("¿Deseas realizar una renovación rápida de esta membresía?")) {
      try {
        await api.post(`/suscripciones/${id}/renovar`);
        fetchData();
      } catch (err) {
        console.error("Error al renovar:", err);
        alert("Error al renovar");
      }
    }
  };

  const handleCongelar = async (id) => {
    if (!id) return alert("ID de suscripción no válido");

    const dias = prompt("¿Cuántos días deseas congelar?");
    if (dias && !isNaN(dias)) {
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const fin = new Date();
        fin.setDate(fin.getDate() + parseInt(dias));
        const fechaFinStr = fin.toISOString().split('T')[0];
        
        await api.post(`/suscripciones/${id}/congelar`, {
          fechaInicio: hoy,
          fechaFin: fechaFinStr,
          motivo: "Congelamiento manual"
        });
        fetchData();
      } catch (err) {
        console.error("Error al congelar:", err);
        alert("Error al congelar");
      }
    }
  };

  const filteredSuscripciones = (Array.isArray(suscripciones) ? suscripciones : []).filter(s => {
    if (!s || !s.socio) return false;
    const nombre = s.socio.nombreCompleto || '';
    const dni = s.socio.dni || '';
    const matchSearch = nombre.toLowerCase().includes(search.toLowerCase()) || 
                        dni.includes(search);
    
    const hoy = new Date();
    const fechaFin = s.fechaFin ? new Date(s.fechaFin) : new Date();
    const diffTime = fechaFin - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filter === 'semana') return matchSearch && diffDays >= 0 && diffDays <= 7;
    if (filter === 'vencidas') return matchSearch && diffDays < 0;
    return matchSearch;
  });

  const filteredSociosForModal = (Array.isArray(socios) ? socios : []).filter(s => 
    s && (s.nombreCompleto.toLowerCase().includes(socioSearch.toLowerCase()) || 
    s.dni.includes(socioSearch))
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
    const hoy = new Date();
    const fin = new Date(s.fechaFin);
    if (fin < hoy) return <span className="badge badge-inactive">VENCIDO</span>;
    return <span className="badge badge-active">ACTIVO</span>;
  };

  return (
    <div className="membresias-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Gestión de <span className="text-gradient">Membresías</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Control de socios activos y configuración de planes comerciales.</p>
        </div>
        
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
      </header>

      {activeTab === 'suscripciones' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Buscar socio o DNI..." 
                  style={{ paddingLeft: '40px', width: '280px' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--panel-bg)', color: 'white', border: '1px solid var(--panel-border)' }}
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

          {/* Table */}
          <div className="card" style={{ padding: '0 24px 24px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos operativos...</div>
            ) : (
              <table>
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
                      <td>
                        <div style={{ fontWeight: '600' }}>{s?.socio?.nombreCompleto || 'Socio desconocido'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DNI: {s?.socio?.dni || 'N/A'}</div>
                      </td>
                      <td>{s?.membresia?.nombre || 'Plan desconocido'}</td>
                      <td>{s?.fechaInicio || '-'}</td>
                      <td style={{ color: s.fechaProximoCobro && new Date(s.fechaProximoCobro) < new Date() ? '#ff3e3e' : '#ffc107', fontWeight: 'bold' }}>
                          {s.fechaProximoCobro ? s.fechaProximoCobro : '-'}
                          {s.fechaProximoCobro && new Date(s.fechaProximoCobro) < new Date() && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#ff3e3e' }}>¡DEUDA! ACCESO BLOQUEADO</span>
                          )}
                        </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} color="var(--text-muted)" />
                          {s?.fechaFin || '-'}
                        </div>
                      </td>
                      <td>{getEstadoBadge(s)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            type="button"
                            title="Registrar Cobro"
                            onClick={(e) => { e.stopPropagation(); handleRegistrarCobro(s); }}
                            style={{ background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <DollarSign size={18} />
                          </button>
                          <button 
                            type="button"
                            title="Renovación rápida"
                            onClick={(e) => { e.stopPropagation(); handleRenovar(s?.id); }}
                            style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <RefreshCw size={18} />
                          </button>
                          {s?.estaCongelada ? (
                            <button 
                              type="button"
                              title="Descongelar membresía"
                              onClick={(e) => { e.stopPropagation(); handleDescongelar(s?.id); }}
                              style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Play size={18} />
                            </button>
                          ) : (
                            <button 
                              type="button"
                              title="Congelar membresía"
                              onClick={(e) => { e.stopPropagation(); handleCongelar(s?.id); }}
                              style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Snowflake size={18} />
                            </button>
                          )}
                          <div style={{ position: 'relative' }}>
                            <button 
                              type="button" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMenuId(activeMenuId === s?.id ? null : s?.id); 
                              }}
                              style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '8px' }}
                            >
                              <MoreVertical size={20} />
                            </button>
                            
                            {activeMenuId === s?.id && (
                              <div style={{ 
                                position: 'absolute', top: '100%', right: 0, background: '#1a1a1e', 
                                border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1200, 
                                minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' 
                              }}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSus(s?.id); }}
                                  style={{ 
                                    width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', 
                                    color: 'var(--accent-primary)', border: 'none', cursor: 'pointer', display: 'flex', 
                                    alignItems: 'center', gap: '8px', transition: '0.2s' 
                                  }}
                                  className="menu-option-delete"
                                >
                                  <Trash2 size={16} /> ELIMINAR
                                </button>
                                <button 
                                  onClick={() => setActiveMenuId(null)}
                                  style={{ 
                                    width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', 
                                    color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', 
                                    alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' 
                                  }}
                                >
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
        /* Catalogo Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Configura los planes y precios que ofreces al público.</h3>
            <button className="btn-primary" onClick={() => setShowPlanModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} /> CREAR NUEVO PLAN
            </button>
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
                
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  S/ {m.precio}
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Duración: {m.duracionDias} días
                </div>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', minHeight: '40px' }}>
                  {m.descripcion || "Sin descripción detallada."}
                </p>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '12px' }}>
                  <button style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '10px', color: 'white' }}>Editar</button>
                  <button style={{ flex: 1, padding: '10px', background: 'rgba(255, 62, 62, 0.1)', border: 'none', borderRadius: '10px', color: 'var(--accent-primary)' }}>Archivar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nueva Membresía (Plan) */}
      {showPlanModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div className="card" style={{ width: '500px', background: '#121215', border: '1px solid rgba(255, 62, 62, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Crear Nuevo Plan</h3>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre del Plan</label>
                <input required type="text" value={planFormData.nombre} onChange={e => setPlanFormData({...planFormData, nombre: e.target.value})} placeholder="Ej: Mensualidad Estándar" />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Precio Total (S/)</label>
                  <input required type="number" step="0.01" value={planFormData.precio} onChange={e => setPlanFormData({...planFormData, precio: e.target.value})} placeholder="Ej: 300.00" />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Costo Mensual (Opcional - S/)</label>
                  <input type="number" step="0.01" value={planFormData.precioMensual} onChange={e => setPlanFormData({...planFormData, precioMensual: e.target.value})} placeholder="Ej: 25.00" />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Si se define, el sistema generará alertas de cobro mensual.</p>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Duración (Días)</label>
                  <input required type="number" value={planFormData.duracionDias} onChange={e => setPlanFormData({...planFormData, duracionDias: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Descripción</label>
                <textarea rows="3" value={planFormData.descripcion} onChange={e => setPlanFormData({...planFormData, descripcion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowPlanModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'white' }}>CANCELAR</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>GUARDAR PLAN</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vender Membresía (Suscripción) */}
      {showSusModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div className="card" style={{ width: '500px', background: '#121215', border: '1px solid rgba(255, 62, 62, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>Vender Plan / Suscripción</h3>
            <form onSubmit={handleCreateSus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Buscar Socio (Nombre o DNI)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Ej: 72312470 o Salas Bances..." 
                    value={socioSearch}
                    onChange={e => {
                      setSocioSearch(e.target.value);
                      setShowSocioList(true);
                    }}
                    onFocus={() => setShowSocioList(true)}
                    style={{ paddingLeft: '40px', width: '100%', marginBottom: '8px' }}
                  />
                </div>

                {showSocioList && socioSearch.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1e', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                    {filteredSociosForModal.length > 0 ? (
                      filteredSociosForModal.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            setSusFormData({...susFormData, socioId: s.id.toString()});
                            setSocioSearch(s.nombreCompleto);
                            setShowSocioList(false);
                          }}
                          style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }}
                          className="socio-option"
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
                
                {selectedSocio && socioHasActiveSub && (
                  <div style={{ color: '#ff3e3e', fontSize: '0.75rem', marginTop: '6px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> El socio ya tiene una membresía activa y vigente.
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Plan a Contratar</label>
                <select required value={susFormData.membresiaId} onChange={e => setSusFormData({...susFormData, membresiaId: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#1a1a1e', border: '1px solid var(--panel-border)', color: 'white', cursor: 'pointer' }}>
                  <option value="" style={{ background: '#121215' }}>Seleccione un plan...</option>
                  {(membresias || []).filter(m => m && (!m.estado || m.estado === 'DISPONIBLE')).map(m => <option key={m.id} value={m.id} style={{ background: '#121215' }}>{m.nombre} - S/ {m.precio}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Fecha de Inicio</label>
                <input type="date" value={susFormData.fechaInicio} onChange={e => setSusFormData({...susFormData, fechaInicio: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => { setShowSusModal(false); setSocioSearch(''); }} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'white' }}>CANCELAR</button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={socioHasActiveSub || !susFormData.socioId || !susFormData.membresiaId}
                  style={{ 
                    flex: 1, 
                    opacity: (socioHasActiveSub || !susFormData.socioId || !susFormData.membresiaId) ? 0.5 : 1, 
                    cursor: (socioHasActiveSub || !susFormData.socioId || !susFormData.membresiaId) ? 'not-allowed' : 'pointer' 
                  }}
                >
                  REGISTRAR VENTA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .socio-option:hover {
          background: rgba(255, 62, 62, 0.1) !important;
        }
      `}} />
    </div>
  );
};

export default Membresias;
