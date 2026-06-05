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
    solicitudesVenta: []
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
        
        const totalVentas = (ventas.data || []).reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
        const totalPlanes = (pagos.data || []).reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
        const listaProductos = productos.data || [];
        const bajoStock = listaProductos.filter(p => p.stock > 0 && p.stock < 5).length;
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
          solicitudesVenta: solVenta.data || []
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const Card = ({ title, value, icon: Icon, color }) => (
    <div className="card stat-card" style={{ flex: 1, minWidth: '240px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ 
          background: color, 
          padding: '12px', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color="var(--text-main)" style={{ filter: 'brightness(0) invert(1) mix-blend-mode(overlay)'}} />
        </div>
        {!loading && <TrendingUp size={16} color="#00ff7f" />}
      </div>
      <div style={{ marginTop: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{title}</p>
        {loading ? (
          <div className="skeleton skeleton-title" style={{ margin: 0 }}></div>
        ) : (
          <h3 style={{ fontSize: '2rem' }}>{value}</h3>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title={<span>¡Bienvenido de <span className="text-gradient">nuevo</span>!</span>}
      subtitle="Aquí tienes un resumen de la actividad de hoy en el gimnasio."
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        <Card 
          title="Total Socios" 
          value={stats.totalSocios} 
          icon={Users} 
          color="var(--accent-secondary)" 
        />
        <Card 
          title="Ingresos Hoy" 
          value={stats.ingresosHoy} 
          icon={Activity} 
          color="var(--accent-primary)" 
        />
        <Card 
          title="Caja Total" 
          value={`S/ ${stats.montoTotalCaja.toFixed(2)}`} 
          icon={DollarSign} 
          color="#00ff7f" 
        />
        <Card 
          title="Ventas Planes" 
          value={`S/ ${stats.montoVendidoPlanes.toFixed(2)}`} 
          icon={Calendar} 
          color="#f59e0b" 
        />
        <Card 
          title="Ventas Productos" 
          value={`S/ ${stats.montoVendidoTotal.toFixed(2)}`} 
          icon={ShoppingBag} 
          color="#3b82f6" 
        />
        <Card 
          title="Planes Activos" 
          value={stats.membresiasActivas} 
          icon={Users} 
          color="rgba(180, 100, 246, 0.8)" 
        />
        {!loading && stats.productosBajoStock > 0 && (
          <Card 
            title="Productos de bajo estock" 
            value={stats.productosBajoStock} 
            icon={AlertTriangle} 
            color="#f59e0b" 
          />
        )}
        {!loading && stats.productosAgotados > 0 && (
          <Card 
            title="Productos agotados" 
            value={stats.productosAgotados} 
            icon={PackageX} 
            color="#ff3e3e" 
          />
        )}
      </section>

      <section className="dashboard-grid" style={{ marginTop: '24px' }}>
        <div className="card" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px' }}>Actividad Reciente</h3>
          
          {loading ? (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '16px' }}>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
          ) : (
            <>
              {/* Placeholder Gráfico Atractivo CSS */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '12px', 
                height: '180px', 
                paddingTop: '20px',
                borderBottom: '1px solid var(--panel-border)'
              }}>
                {[30, 50, 40, 80, 60, 90, 70, 75, 40, 65].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: 'rgba(255, 62, 62, 0.1)', borderRadius: '6px 6px 0 0', height: `${h}%`, position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, width: '100%', 
                      height: `${h * 0.8}%`, 
                      background: 'linear-gradient(0deg, var(--accent-primary), var(--accent-secondary))', 
                      borderRadius: '6px 6px 0 0',
                      opacity: 0.8
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span>Lunes</span>
                <span>Miércoles</span>
                <span>Viernes</span>
                <span>Domingo</span>
              </div>
            </>
          )}
        </div>
        
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Últimos Miembros</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ margin: 0, marginBottom: '6px', height: '14px' }}></div>
                    <div className="skeleton skeleton-text short" style={{ margin: 0, height: '10px' }}></div>
                  </div>
                </li>
              ))
            ) : stats.ultimosMiembros.length > 0 ? (
              stats.ultimosMiembros.map((miembro, i) => {
                const initial = miembro.nombreCompleto ? miembro.nombreCompleto.charAt(0).toUpperCase() : String.fromCharCode(65 + i);
                const planName = miembro.suscripciones && miembro.suscripciones.length > 0 
                  ? miembro.suscripciones[0].membresia.nombre 
                  : (miembro.estado || 'Membresía Activa');

                return (
                  <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'var(--panel-border)',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      {initial}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{miembro.nombreCompleto || `Miembro #${i+1}`}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{planName}</p>
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

      {/* Sección de Solicitudes Pendientes */}
      <section className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={24} color="var(--accent-primary)" />
            Solicitudes Pendientes de Validación
          </h3>
          <button 
            className="btn-secondary" 
            onClick={() => navigate('/solicitudes')}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            Ir a Bandeja de Solicitudes
          </button>
        </div>

        {/* Pestañas de tipo de solicitud */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <button 
            onClick={() => setActiveRequestTab('MEMBRESIA')}
            style={{
              background: activeRequestTab === 'MEMBRESIA' ? 'rgba(255, 62, 62, 0.1)' : 'none',
              color: activeRequestTab === 'MEMBRESIA' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Award size={16} /> Membresías
            <span style={{ 
              background: activeRequestTab === 'MEMBRESIA' ? 'var(--accent-primary)' : 'var(--panel-border)',
              color: activeRequestTab === 'MEMBRESIA' ? 'white' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginLeft: '4px'
            }}>
              {stats.solicitudesMembresia.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveRequestTab('PRODUCTO')}
            style={{
              background: activeRequestTab === 'PRODUCTO' ? 'rgba(255, 62, 62, 0.1)' : 'none',
              color: activeRequestTab === 'PRODUCTO' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <ShoppingBag size={16} /> Productos
            <span style={{ 
              background: activeRequestTab === 'PRODUCTO' ? 'var(--accent-primary)' : 'var(--panel-border)',
              color: activeRequestTab === 'PRODUCTO' ? 'white' : 'var(--text-muted)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginLeft: '4px'
            }}>
              {stats.solicitudesVenta.length}
            </span>
          </button>
        </div>

        {/* Contenedor de tabla */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando solicitudes...</div>
          ) : activeRequestTab === 'MEMBRESIA' ? (
            stats.solicitudesMembresia.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                No hay solicitudes de membresía pendientes.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>DNI</th>
                    <th>Cliente</th>
                    <th>Membresía</th>
                    <th>N° Operación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.solicitudesMembresia.map(sol => (
                    <tr key={sol.id}>
                      <td>{new Date(sol.fechaSolicitud).toLocaleDateString()}</td>
                      <td><strong>{sol.dni}</strong></td>
                      <td>
                        {sol.nombreCompleto}
                        {sol.telefono && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tel: {sol.telefono}</div>}
                      </td>
                      <td>{sol.membresiaNombre}</td>
                      <td>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                          {sol.numeroOperacion || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary"
                          onClick={() => navigate('/solicitudes')}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Validar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            stats.solicitudesVenta.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                No hay solicitudes de productos pendientes.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>DNI</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>N° Operación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.solicitudesVenta.map(sol => (
                    <tr key={sol.id}>
                      <td>{new Date(sol.fechaSolicitud).toLocaleDateString()}</td>
                      <td><strong>{sol.dni}</strong></td>
                      <td>
                        {sol.nombreCompleto}
                        {sol.telefono && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tel: {sol.telefono}</div>}
                      </td>
                      <td><strong>S/ {sol.total?.toFixed(2)}</strong></td>
                      <td>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                          {sol.numeroOperacion || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary"
                          onClick={() => navigate('/solicitudes')}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Validar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </section>
    </PageLayout>
  );
};

export default Dashboard;
