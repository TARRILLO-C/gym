import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Activity,
  Package,
  DollarSign,
  ShoppingBag,
  Award,
  FileText,
  AlertTriangle,
  PackageX
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSocios: 0,
    ingresosHoy: 0,
    membresiasActivas: 0,
    productosBajoStock: 0,
    productosAgotados: 0,
    totalProductos: 0,
    totalVentasCount: 0,
    montoVendidoTotal: 0,
    montoVendidoPlanes: 0,
    montoTotalCaja: 0,
    ultimosMiembros: [],
    solicitudesMembresia: [],
    solicitudesVenta: [],
    actividadSemana: { data: [], max: 1 }
  });
  const [loading, setLoading] = useState(true);
  const [activeRequestTab, setActiveRequestTab] = useState('MEMBRESIA');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [socios, ingresos, productos, ventas, pagos, solMembresia, solVenta] = await Promise.all([
          api.get('/socios').catch(err => { console.error("Error fetching socios:", err); return { data: [] }; }),
          api.get('/asistencias/hoy').catch(err => { console.error("Error fetching asistencias:", err); return { data: [] }; }),
          api.get('/productos').catch(err => { console.error("Error fetching productos:", err); return { data: [] }; }),
          api.get('/ventas').catch(err => { console.error("Error fetching ventas:", err); return { data: [] }; }),
          api.get('/pagos').catch(err => { console.error("Error fetching pagos:", err); return { data: [] }; }),
          api.get('/solicitudes-membresia/pendientes').catch(err => { console.error("Error fetching solicitudes-membresia:", err); return { data: [] }; }),
          api.get('/solicitudes-producto/pendientes').catch(err => { console.error("Error fetching solicitudes-producto:", err); return { data: [] }; })
        ]);
        
        // Extraer asistencia de los ultimos 7 dias
        const hoyDate = new Date();
        const fechaHasta = hoyDate.toISOString().split('T')[0];
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 6);
        const fechaDesde = hace7Dias.toISOString().split('T')[0];
        
        const resSemana = await api.get(`/asistencias/buscar?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`).catch(() => ({ data: [] }));
        
        const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const ultimos7Dias = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            ultimos7Dias.push({
                fechaStr: d.toISOString().split('T')[0],
                diaNombre: diasNombres[d.getDay()],
                count: 0
            });
        }
        
        (resSemana.data || []).forEach(a => {
            if (a.fechaHoraIngreso) {
                const fecha = a.fechaHoraIngreso.split('T')[0];
                const target = ultimos7Dias.find(d => d.fechaStr === fecha);
                if (target) target.count++;
            }
        });
        
        const maxAsistencias = Math.max(...ultimos7Dias.map(d => d.count), 1);

        const totalVentas = (ventas.data || []).reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
        const totalPlanes = (pagos.data || []).reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
        const listaProductos = productos.data || [];
        const bajoStock = listaProductos.filter(p => p.stock > 0 && p.stock < (p.stockMinimo ?? 5)).length;
        const agotados = listaProductos.filter(p => p.stock === 0).length;

        setStats({
          totalSocios: (socios.data || []).length,
          ingresosHoy: (ingresos.data || []).length,
          membresiasActivas: (socios.data || []).filter(s => s.status === 'ACTIVO' || s.estado === 'ACTIVO').length,
          productosBajoStock: bajoStock,
          productosAgotados: agotados,
          totalProductos: (productos.data || []).length,
          totalVentasCount: (ventas.data || []).length,
          montoVendidoTotal: totalVentas,
          montoVendidoPlanes: totalPlanes,
          montoTotalCaja: totalVentas + totalPlanes,
          ultimosMiembros: (socios.data || []).slice(-4).reverse(),
          solicitudesMembresia: solMembresia.data || [],
          solicitudesVenta: solVenta.data || [],
          actividadSemana: { data: ultimos7Dias, max: maxAsistencias }
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const Card = ({ title, value, icon: Icon, color, to }) => (
    <div 
      className="card stat-card" 
      onClick={() => to && navigate(to)}
      style={{ 
        flex: 1, 
        padding: '16px', // Padding más pequeño
        cursor: to ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)' // Sombra por defecto ultra suave
      }}
      onMouseEnter={(e) => {
        if (to) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.08)'; // Sombra hover más sutil
          e.currentTarget.style.borderColor = color;
        }
      }}
      onMouseLeave={(e) => {
        if (to) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)';
          e.currentTarget.style.borderColor = 'var(--panel-border, #334155)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ 
          background: color, 
          padding: '10px', 
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={18} color="var(--text-main)" style={{ filter: 'brightness(0) invert(1) mix-blend-mode(overlay)'}} />
        </div>
        {!loading && <TrendingUp size={14} color="#00ff7f" opacity={0.7} />}
      </div>
      <div style={{ marginTop: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px', fontWeight: '500' }}>{title}</p>
        {loading ? (
          <div className="skeleton skeleton-title" style={{ margin: 0, height: '24px' }}></div>
        ) : (
          <h3 style={{ fontSize: '1.4rem', fontWeight: '600' }}>{value}</h3>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title={<span>¡Bienvenido de <span className="text-gradient">nuevo</span>!</span>}
      subtitle="Aquí tienes un resumen de la actividad de hoy en el gimnasio."
    >
      <section className="dashboard-cards-grid">
        <Card title="Total Socios" value={stats.totalSocios} icon={Users} color="var(--accent-secondary)" to="/socios" />
        <Card title="Ingresos Hoy" value={stats.ingresosHoy} icon={Activity} color="var(--accent-primary)" to="/asistencia" />
        <Card title="Caja Total" value={`S/ ${stats.montoTotalCaja.toFixed(2)}`} icon={DollarSign} color="#00ff7f" to="/ventas" />
        <Card title="Ventas Planes" value={`S/ ${stats.montoVendidoPlanes.toFixed(2)}`} icon={Calendar} color="#f59e0b" to="/ventas" />
        <Card title="Ventas Productos" value={`S/ ${stats.montoVendidoTotal.toFixed(2)}`} icon={ShoppingBag} color="#3b82f6" to="/ventas" />
        <Card title="Planes Activos" value={stats.membresiasActivas} icon={Users} color="rgba(180, 100, 246, 0.8)" to="/socios" />
        {!loading && stats.productosBajoStock > 0 && (
          <Card title="Productos de bajo estock" value={stats.productosBajoStock} icon={AlertTriangle} color="#f59e0b" to="/productos" />
        )}
        {!loading && stats.productosAgotados > 0 && (
          <Card title="Productos agotados" value={stats.productosAgotados} icon={PackageX} color="#ff3e3e" to="/productos" />
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        {/* Gráfico Circular de Asistencias (Radial Bar Chart) por Día */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px' }}>Actividad Reciente</h3>
          {loading ? (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '16px' }}>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', marginTop: 'auto', marginBottom: 'auto' }}>
              {/* SVG de anillos */}
              <div style={{ position: 'relative', width: '220px', height: '220px' }}>
                <svg viewBox="0 0 240 240" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="radialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--accent-primary)" />
                      <stop offset="100%" stopColor="var(--accent-secondary)" />
                    </linearGradient>
                  </defs>
                  {stats.actividadSemana.data.map((item, index) => {
                    const inverseIndex = 6 - index; 
                    const radius = 30 + (inverseIndex * 13); 
                    const circumference = 2 * Math.PI * radius;
                    const percentage = item.count / (stats.actividadSemana.max || 1);
                    const offset = circumference - (circumference * percentage);
                    const isMax = item.count === stats.actividadSemana.max && item.count > 0;
                    return (
                      <g key={index}>
                        <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(255,62,62,0.05)" strokeWidth="8" />
                        <circle cx="120" cy="120" r={radius} fill="none" stroke={isMax ? "url(#radialGrad)" : "rgba(255,62,62,0.4)"} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out', filter: isMax ? 'drop-shadow(0px 2px 4px rgba(255, 62, 62, 0.4))' : 'none' }} />
                      </g>
                    );
                  })}
                </svg>
              </div>
              
              {/* Leyenda de Días */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '20px' }}>
                {stats.actividadSemana.data.map((item, index) => {
                  const isMax = item.count === stats.actividadSemana.max && item.count > 0;
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isMax ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'rgba(255,62,62,0.4)', boxShadow: isMax ? '0 0 5px rgba(255,62,62,0.5)' : 'none' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '70px' }}>
                        <span style={{ fontSize: '0.85rem', color: isMax ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isMax ? 'bold' : 'normal' }}>{item.diaNombre}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{item.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Solicitudes Pendientes */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <FileText size={20} color="var(--accent-primary)" /> Solicitudes Pendientes
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
            <button onClick={() => setActiveRequestTab('MEMBRESIA')} style={{ background: activeRequestTab === 'MEMBRESIA' ? 'rgba(255, 62, 62, 0.1)' : 'none', color: activeRequestTab === 'MEMBRESIA' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Award size={14} /> Membresías
              <span style={{ background: activeRequestTab === 'MEMBRESIA' ? 'var(--accent-primary)' : 'var(--panel-border)', color: activeRequestTab === 'MEMBRESIA' ? 'white' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>{stats.solicitudesMembresia.length}</span>
            </button>
            <button onClick={() => setActiveRequestTab('PRODUCTO')} style={{ background: activeRequestTab === 'PRODUCTO' ? 'rgba(255, 62, 62, 0.1)' : 'none', color: activeRequestTab === 'PRODUCTO' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <ShoppingBag size={14} /> Productos
              <span style={{ background: activeRequestTab === 'PRODUCTO' ? 'var(--accent-primary)' : 'var(--panel-border)', color: activeRequestTab === 'PRODUCTO' ? 'white' : 'var(--text-muted)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>{stats.solicitudesVenta.length}</span>
            </button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '280px' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
            ) : activeRequestTab === 'MEMBRESIA' ? (
              stats.solicitudesMembresia.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay solicitudes pendientes.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stats.solicitudesMembresia.map(sol => (
                    <li key={sol.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><strong style={{ fontSize: '0.9rem' }}>{sol.nombreCompleto}</strong><span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>#{sol.numeroOperacion}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sol.membresiaNombre}</span><button onClick={() => navigate('/solicitudes')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Revisar</button></div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              stats.solicitudesVenta.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay solicitudes pendientes.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stats.solicitudesVenta.map(sol => (
                    <li key={sol.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><strong style={{ fontSize: '0.9rem' }}>{sol.nombreCompleto}</strong><span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>#{sol.numeroOperacion}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>S/ {sol.total?.toFixed(2)}</span><button onClick={() => navigate('/solicitudes')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Revisar</button></div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
          <button onClick={() => navigate('/solicitudes')} style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Ver todas las solicitudes
          </button>
        </div>

        {/* Últimos Miembros */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px' }}>Últimos Miembros</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                  <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ margin: 0, marginBottom: '6px', height: '14px' }}></div><div className="skeleton skeleton-text short" style={{ margin: 0, height: '10px' }}></div></div>
                </li>
              ))
            ) : stats.ultimosMiembros.length > 0 ? (
              stats.ultimosMiembros.map((miembro, i) => {
                const initial = miembro.nombreCompleto ? miembro.nombreCompleto.charAt(0).toUpperCase() : String.fromCharCode(65 + i);
                const planName = miembro.suscripciones && miembro.suscripciones.length > 0 ? miembro.suscripciones[0].membresia.nombre : (miembro.estado || 'Membresía Activa');
                return (
                  <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--panel-border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{initial}</div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem', margin: 0 }}>{miembro.nombreCompleto || `Miembro #${i+1}`}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{planName}</p>
                    </div>
                  </li>
                );
              })
            ) : (
                <li style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>No hay miembros recientes que mostrar</li>
            )}
          </ul>
        </div>
      </section>

    </PageLayout>
  );
};

export default Dashboard;
