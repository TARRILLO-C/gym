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
  XCircle,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';

const Membresias = () => {
  const [activeTab, setActiveTab] = useState('suscripciones');
  const [suscripciones, setSuscripciones] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [filterMode, setFilterMode] = useState('ALL');
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
    precioCuota: '',
    frecuenciaCobroDias: 30,
    duracionDias: '',
    descripcion: '',
    estado: 'DISPONIBLE',
    permiteCongelamiento: true
  });

  const [susFormData, setSusFormData] = useState({
    socioId: '',
    membresiaId: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    estadoPago: 'PAGADO',
    pagoTotal: true
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
      isOpen: true, type: 'confirm', title: 'Anular Membresía',
      message: '¿Estás seguro de anular esta suscripción? Esto invalidará el acceso del socio al gimnasio bajo este plan.',
      onConfirm: async () => {
        try {
          await api.delete(`/suscripciones/${id}`);
          fetchData();
        } catch (err) {
          showAlert('Error', 'No se pudo anular la suscripción');
        }
      }
    });
  };

  const handleRestoreSus = (sus) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Reactivar Suscripción',
      message: `¿Estás seguro de reactivar la suscripción de "${sus.socio.nombreCompleto}"?`,
      onConfirm: async () => {
        try {
          await api.put(`/suscripciones/${sus.id}/restaurar`);
          await fetchData();
        } catch (err) { showAlert('Error', 'Error al reactivar la suscripción'); }
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
    let montoPredefinido = sus.membresia.precioCuota || sus.membresia.precio;
    const processCobro = async (monto) => {
      try {
        const resp = await api.post(`/pagos/suscripcion/${sus.id}`, {
          monto: parseFloat(monto),
          metodoPago: 'EFECTIVO'
        });
        
        const nuevaFecha = resp.data?.suscripcion?.fechaProximoCobro;
        if (nuevaFecha) {
          showAlert("Éxito", `¡Cobro realizado con éxito! Próxima fecha de cobro: ${nuevaFecha}`);
        } else {
          showAlert("Éxito", "¡Cobro realizado con éxito! Ya no hay pagos pendientes en este plan.");
        }
        
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
    
    // Validaciones estrictas de frontend para Membresías
    if (!planFormData.nombre || planFormData.nombre.trim() === '') {
      showAlert("Aviso", "El nombre del plan no puede estar vacío.");
      return;
    }
    if (parseFloat(planFormData.precio) <= 0 || isNaN(parseFloat(planFormData.precio))) {
      showAlert("Aviso Fiscal", "El precio del plan debe ser estrictamente mayor a 0.");
      return;
    }
    if (parseInt(planFormData.duracionDias) <= 0 || isNaN(parseInt(planFormData.duracionDias))) {
      showAlert("Aviso Lógico", "Un plan no puede tener duración 0 días. Ingrese una duración válida.");
      return;
    }

    try {
      if (editingPlanId) {
        await api.put(`/membresias/${editingPlanId}`, planFormData);
      } else {
        await api.post('/membresias', planFormData);
      }
      setShowPlanModal(false);
      await fetchData();
      setPlanFormData({ nombre: '', precio: '', precioCuota: '', frecuenciaCobroDias: 30, duracionDias: '', descripcion: '', estado: 'DISPONIBLE', permiteCongelamiento: true });
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

  const handleRenovar = (sus) => {
    if (!sus || !sus.socio || !sus.membresia) return;
    
    // Auto-llenar el modal de Vender Plan y mostrarlo obligatoriamente
    setSocioSearch(sus.socio.nombreCompleto);
    setSusFormData({
      socioId: sus.socio.id.toString(),
      membresiaId: sus.membresia.id.toString(),
      // Si la suscripción está vencida, la nueva arranca hoy.
      // Si aún no vence, la nueva debe arrancar cuando vence la actual.
      fechaInicio: (sus.fechaFin && new Date(sus.fechaFin) > new Date()) 
                     ? sus.fechaFin 
                     : new Date().toISOString().split('T')[0],
      estadoPago: 'PAGADO',
      pagoTotal: true
    });
    
    setShowSusModal(true);
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

  const filteredSuscripciones = (Array.isArray(suscripciones) ? suscripciones : [])
    .filter(s => {
      if (filterMode === 'ACTIVO') return s && s.activo !== false;
      if (filterMode === 'INACTIVO') return s && s.activo === false;
      return true;
    })
    .filter(s => {
    if (!s || !s.socio) return false;
    const matchSearch = (s.socio.nombreCompleto || '').toLowerCase().includes(search.toLowerCase()) || (s.socio.dni || '').includes(search);
    const hoyStrFilter = new Date().toISOString().split('T')[0];
    const finStr = s.fechaFin || hoyStrFilter;
    
    // Comparación matemática estricta usando locale Date
    const difTime = new Date(finStr + 'T00:00:00').getTime() - new Date(hoyStrFilter + 'T00:00:00').getTime();
    const dif = Math.ceil(difTime / (1000 * 3600 * 24));

    if (filter === 'semana') return matchSearch && dif >= 0 && dif <= 7;
    if (filter === 'vencidas') return matchSearch && (dif < 0 || s.estadoPago === 'VENCIDO');
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
    const hoyStr = new Date().toISOString().split('T')[0];
    if (s.estaCongelada) return <span className="badge" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>CONGELADA</span>;
    if (s.estadoPago === 'VENCIDO' || s.estadoPago === 'PENDIENTE') {
      return <span className="badge badge-inactive" style={{ background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e' }}>INACTIVO (DEUDA)</span>;
    }
    if (!s.fechaFin) return <span className="badge badge-active">ACTIVO</span>;
    if (s.fechaFin < hoyStr) return <span className="badge badge-inactive">VENCIDO (FECHA)</span>;
    return <span className="badge badge-active">ACTIVO</span>;
  };

  const selectedMembresia = (membresias || []).find(m => m.id?.toString() === susFormData.membresiaId?.toString());
  const showPaymentMode = selectedMembresia && selectedMembresia.precioCuota > 0 && selectedMembresia.duracionDias > (selectedMembresia.frecuenciaCobroDias || 30);
  const hoyStrRender = new Date().toISOString().split('T')[0];

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
                <option value="todas">Todas las categorías</option>
                <option value="semana">Vencen esta semana</option>
                <option value="vencidas">Ya vencidas</option>
              </select>

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
                  Archivados
                </button>
              </div>
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
                      <td data-label="PRÓXIMO COBRO" style={{ color: s.fechaProximoCobro && s.fechaProximoCobro < hoyStrRender && s.estadoPago !== 'PAGADO' ? '#ff3e3e' : 'var(--accent-secondary)', fontWeight: 'bold' }}>
                          {s.fechaProximoCobro ? s.fechaProximoCobro : '-'}
                          {s.fechaProximoCobro && s.fechaProximoCobro < hoyStrRender && s.estadoPago !== 'PAGADO' && (
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
                          <button onClick={(e) => { e.stopPropagation(); handleRenovar(s); }} style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                            <RefreshCw size={18} />
                          </button>
                          {s?.estaCongelada ? (
                            <button onClick={(e) => { e.stopPropagation(); handleDescongelar(s?.id); }} style={{ background: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                              <Play size={18} />
                            </button>
                          ) : (
                            s?.membresia?.permiteCongelamiento !== false && (
                              <button onClick={(e) => { e.stopPropagation(); handleCongelar(s?.id); }} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                <Snowflake size={18} />
                              </button>
                            )
                          )}
                          <div style={{ position: 'relative' }}>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s?.id ? null : s?.id); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '8px' }}>
                              <MoreVertical size={20} />
                            </button>
                            {activeMenuId === s?.id && (
                              <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1200, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                {s.activo !== false ? (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSus(s?.id); }} style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: 'var(--accent-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Trash2 size={16} /> ANULAR PLAN
                                  </button>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); handleRestoreSus(s); }} style={{ width: '100%', padding: '12px 16px', background: 'transparent', color: '#00ff7f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RotateCcw size={16} /> RESTAURAR
                                  </button>
                                )}
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
              <button className="btn-primary" onClick={() => { setEditingPlanId(null); setPlanFormData({ nombre: '', precio: '', precioCuota: '', frecuenciaCobroDias: 30, duracionDias: '', descripcion: '', estado: 'DISPONIBLE', permiteCongelamiento: true }); setShowPlanModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {m.precioCuota > 0 && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>(S/ {m.precioCuota} cada {m.frecuenciaCobroDias || 30} días)</span>
                    )}
                  </div>
                  <span className="badge" style={{ 
                    background: (!m.estado || m.estado === 'DISPONIBLE') ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 255, 255, 0.1)', 
                    color: (!m.estado || m.estado === 'DISPONIBLE') ? '#00ff7f' : 'var(--text-muted)' 
                  }}>
                    {m.estado || 'DISPONIBLE'}
                  </span>
                  {m.permiteCongelamiento !== false && (
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', marginLeft: '8px' }}>
                      CONGELAMIENTO
                    </span>
                  )}
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
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlanId ? "Editar Plan de Membresía" : "Configurar Nuevo Plan"}>
        <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Nombre Identificador</label>
            <input required type="text" value={planFormData.nombre} onChange={e => setPlanFormData({...planFormData, nombre: e.target.value})} placeholder="Ej: Trimestre Promocional" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Duración (Días)</label>
              <input required type="number" min="1" step="1" placeholder="Ej: 30" value={planFormData.duracionDias} onChange={e => setPlanFormData({...planFormData, duracionDias: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Precio Público (S/)</label>
              <input required type="number" min="0.01" step="0.01" placeholder="Ej: 99.00" value={planFormData.precio} onChange={e => setPlanFormData({...planFormData, precio: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Costo Cuota Fraccionada (S/ - Opcional)</label>
              <input type="number" min="0" step="0.01" placeholder="Ej: 33.00" value={planFormData.precioCuota} onChange={e => setPlanFormData({...planFormData, precioCuota: e.target.value})} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>* Útil para pagos segmentados.</p>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Frecuencia de Cobro</label>
              <select value={planFormData.frecuenciaCobroDias} onChange={e => setPlanFormData({...planFormData, frecuenciaCobroDias: parseInt(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}>
                <option value={7}>Semanal (7 días)</option>
                <option value={14}>Quincenal (14 días)</option>
                <option value={30}>Mensual (30 días)</option>
                <option value={90}>Trimestral (90 días)</option>
                <option value={180}>Semestral (180 días)</option>
                <option value={365}>Anual (365 días)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Especificaciones y Beneficios</label>
            <textarea rows="3" placeholder="Describe lo que incluye este plan..." value={planFormData.descripcion} onChange={e => setPlanFormData({...planFormData, descripcion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
            <input 
              type="checkbox" 
              id="permiteCongelamiento"
              checked={planFormData.permiteCongelamiento !== false} 
              onChange={e => setPlanFormData({...planFormData, permiteCongelamiento: e.target.checked})}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
            />
            <label htmlFor="permiteCongelamiento" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}>
              Permitir que las suscripciones a este plan puedan ser congeladas
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={() => setShowPlanModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', color: 'var(--text-main)', fontWeight: 'bold' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', fontWeight: 'bold' }}>
              {editingPlanId ? "ACTUALIZAR" : "GUARDAR PLAN"}
            </button>
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
          
          {showPaymentMode && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Modalidad de Pago</label>
              <select value={susFormData.pagoTotal} onChange={e => setSusFormData({...susFormData, pagoTotal: e.target.value === 'true'})} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }}>
                <option value="true">1. Pago Total al Contado (Promo) - S/ {selectedMembresia.precio}</option>
                <option value="false">2. Pago Fraccionado - S/ {selectedMembresia.precioCuota} cada {selectedMembresia.frecuenciaCobroDias || 30} días</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Fecha de Inicio</label>
            <input type="date" value={susFormData.fechaInicio} onChange={e => setSusFormData({...susFormData, fechaInicio: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={() => { setShowSusModal(false); setSocioSearch(''); }} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" disabled={!susFormData.socioId || !susFormData.membresiaId} style={{ flex: 1, opacity: (!susFormData.socioId || !susFormData.membresiaId) ? 0.5 : 1 }}>
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
