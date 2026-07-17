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
    actividadSemana: { data: [], max: 1 },
    ingresosSemana: [],
    horasPico: { data: [], max: 1 }
  });
  const [loading, setLoading] = useState(true);
  const [activeRequestTab, setActiveRequestTab] = useState('MEMBRESIA');
  const [hoveredDay, setHoveredDay] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [socios, ingresos, productos, ventas, pagos, solMembresia, solVenta, horasPicoRes] = await Promise.all([
          api.get('/socios').catch(err => { console.error("Error fetching socios:", err); return { data: [] }; }),
          api.get('/asistencias/hoy').catch(err => { console.error("Error fetching asistencias:", err); return { data: [] }; }),
          api.get('/productos').catch(err => { console.error("Error fetching productos:", err); return { data: [] }; }),
          api.get('/ventas?page=0&size=200&sort=id,desc').catch(err => { console.error("Error fetching ventas:", err); return { data: { content: [] } }; }),
          api.get('/pagos').catch(err => { console.error("Error fetching pagos:", err); return { data: [] }; }),
          api.get('/solicitudes-membresia/pendientes').catch(err => { console.error("Error fetching solicitudes-membresia:", err); return { data: [] }; }),
          api.get('/solicitudes-producto/pendientes').catch(err => { console.error("Error fetching solicitudes-producto:", err); return { data: [] }; }),
          api.get('/asistencias/analitica/horas-pico?dias=30').catch(err => { console.error("Error fetching horas pico:", err); return { data: {} }; })
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

        const totalVentas = (ventas.data?.content || []).reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
        const totalPlanes = (pagos.data || []).reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);
        const listaProductos = productos.data || [];
        const bajoStock = listaProductos.filter(p => p.stock > 0 && p.stock < (p.stockMinimo ?? 5)).length;
        const agotados = listaProductos.filter(p => p.stock === 0).length;

        const ingresos7Dias = ultimos7Dias.map(dia => {
          const pagosEnDia = (pagos.data || []).filter(p => p.fechaPago && p.fechaPago.split('T')[0] === dia.fechaStr);
          const montoPlanes = pagosEnDia.reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

          const ventasEnDia = (ventas.data?.content || []).filter(v => v.fecha && v.activo !== false && v.fecha.split('T')[0] === dia.fechaStr);
          const montoProductos = ventasEnDia.reduce((acc, v) => acc + parseFloat(v.total || 0), 0);

          return {
            ...dia,
            planes: montoPlanes,
            productos: montoProductos,
            total: montoPlanes + montoProductos
          };
        });

        const rawHoras = horasPicoRes.data || {};
        const horasData = Object.entries(rawHoras).map(([horaStr, count]) => ({
          hora: parseInt(horaStr),
          count: parseInt(count),
          label: parseInt(horaStr) > 12 ? `${parseInt(horaStr) - 12}pm` : parseInt(horaStr) === 12 ? '12pm' : `${horaStr}am`
        }));
        const maxHoraCount = Math.max(...horasData.map(h => h.count), 1);

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
          actividadSemana: { data: ultimos7Dias, max: maxAsistencias },
          ingresosSemana: ingresos7Dias,
          horasPico: { data: horasData, max: maxHoraCount }
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

      {/* Gráfico de Flujo de Ingresos de la Semana */}
      <section style={{ marginTop: '24px' }}>
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Flujo de Ingresos Semanales</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Comparativa diaria de ingresos de membresías y ventas de productos.</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 6px var(--accent-primary)' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Membresías</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }}></div>
                <span style={{ color: 'var(--text-muted)' }}>Productos</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: '220px', width: '100%' }}></div>
          ) : (
            <div style={{ position: 'relative', width: '100%' }}>
              {/* Tooltip flotante */}
              {hoveredDay !== null && stats.ingresosSemana[hoveredDay] && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: `${Math.min(Math.max(40 + hoveredDay * 90, 85), 515)}px`,
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: 'var(--bg-color)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(5px)',
                  zIndex: 10,
                  pointerEvents: 'none',
                  minWidth: '160px'
                }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    {stats.ingresosSemana[hoveredDay].diaNombre} ({stats.ingresosSemana[hoveredDay].fechaStr})
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0' }}>
                    <span>Membresías:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>S/ {stats.ingresosSemana[hoveredDay].planes.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0' }}>
                    <span>Productos:</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>S/ {stats.ingresosSemana[hoveredDay].productos.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', borderTop: '1px solid var(--panel-border)', paddingTop: '6px', marginTop: '6px', color: 'var(--text-main)' }}>
                    <span>Total:</span>
                    <span style={{ color: '#00ff7f' }}>S/ {stats.ingresosSemana[hoveredDay].total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Renderizado de gráfico SVG */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg viewBox="0 0 600 220" style={{ width: '100%', minWidth: '550px', height: 'auto', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="areaGradProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                    const y = 20 + 150 * p;
                    const maxVal = Math.max(...stats.ingresosSemana.map(d => d.total), 100);
                    const val = maxVal * (1 - p);
                    return (
                      <g key={idx}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="var(--panel-border)" strokeWidth="1" strokeDasharray="4 4" />
                        <text x="35" y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">S/ {Math.round(val)}</text>
                      </g>
                    );
                  })}

                  {/* Eje X Labels */}
                  {stats.ingresosSemana.map((d, idx) => (
                    <text key={idx} x={40 + idx * 90} y="190" fill="var(--text-muted)" fontSize="10" textAnchor="middle">{d.diaNombre}</text>
                  ))}

                  {/* Draw Areas */}
                  {(() => {
                    const maxVal = Math.max(...stats.ingresosSemana.map(d => d.total), 100);
                    
                    // Path para membresias
                    const pointsPlanes = stats.ingresosSemana.map((d, idx) => {
                      const x = 40 + idx * 90;
                      const y = 170 - 150 * (d.planes / maxVal);
                      return { x, y };
                    });
                    const dPlanes = pointsPlanes.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const dAreaPlanes = `${dPlanes} L ${pointsPlanes[pointsPlanes.length - 1].x} 170 L ${pointsPlanes[0].x} 170 Z`;

                    // Path para productos
                    const pointsProductos = stats.ingresosSemana.map((d, idx) => {
                      const x = 40 + idx * 90;
                      const y = 170 - 150 * (d.productos / maxVal);
                      return { x, y };
                    });
                    const dProductos = pointsProductos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const dAreaProductos = `${dProductos} L ${pointsProductos[pointsProductos.length - 1].x} 170 L ${pointsProductos[0].x} 170 Z`;

                    return (
                      <>
                        {/* Area de Productos */}
                        <path d={dAreaProductos} fill="url(#areaGradProd)" />
                        <path d={dProductos} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />

                        {/* Area de Membresias */}
                        <path d={dAreaPlanes} fill="url(#areaGrad)" />
                        <path d={dPlanes} fill="none" stroke="var(--accent-primary)" strokeWidth="3" />

                        {/* Interactive vertical hover zones */}
                        {stats.ingresosSemana.map((d, idx) => {
                          const x = 40 + idx * 90;
                          return (
                            <g key={idx}
                               onMouseEnter={() => setHoveredDay(idx)}
                               onMouseLeave={() => setHoveredDay(null)}
                               style={{ cursor: 'pointer' }}>
                              
                              {/* Vertical Line on Hover */}
                              {hoveredDay === idx && (
                                <line x1={x} y1="20" x2={x} y2="170" stroke="var(--accent-primary)" strokeWidth="1.5" strokeDasharray="2 2" />
                              )}

                              {/* Hover zone transparent rect */}
                              <rect x={x - 45} y="20" width="90" height="150" fill="transparent" />

                              {/* Points */}
                              <circle cx={x} cy={170 - 150 * (d.planes / maxVal)} r={hoveredDay === idx ? 6 : 4} fill="var(--accent-primary)" stroke="var(--bg-color)" strokeWidth="2" />
                              <circle cx={x} cy={170 - 150 * (d.productos / maxVal)} r={hoveredDay === idx ? 5 : 3.5} fill="#3b82f6" stroke="var(--bg-color)" strokeWidth="1.5" />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
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

        {/* Afluencia por Horas (Horas Pico) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Afluencia por Horas</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Distribución de ingresos durante el último mes para identificar horas pico.
            </p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ flex: 1, width: '100%' }}></div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '10px', marginTop: '20px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4px', height: '170px' }}>
                {stats.horasPico.data && stats.horasPico.data.length > 0 ? (
                  stats.horasPico.data.map((h, idx) => {
                    const percentage = h.count / (stats.horasPico.max || 1);
                    const isPeak = h.count === stats.horasPico.max && h.count > 0;
                    return (
                      <div key={idx} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        {/* Bar Container */}
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                          {/* Tooltip on hover */}
                          <div className="bar-tooltip" style={{
                            position: 'absolute',
                            bottom: `${percentage * 100 + 5}%`,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'var(--bg-color, #0f172a)',
                            border: '1px solid var(--panel-border, #334155)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            pointerEvents: 'none',
                            opacity: 0,
                            transition: 'opacity 0.2s ease',
                            whiteSpace: 'nowrap',
                            zIndex: 5,
                            color: 'var(--text-main, #f8fafc)'
                          }}>
                            {h.count} checkins
                          </div>
                          {/* The Actual Bar */}
                          <div 
                            style={{
                              width: '80%',
                              height: `${Math.max(percentage * 100, 4)}%`,
                              background: isPeak 
                                ? 'linear-gradient(0deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' 
                                : 'var(--panel-border, #334155)',
                              borderRadius: '4px 4px 0 0',
                              margin: '0 auto',
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              boxShadow: isPeak ? '0 0 12px var(--accent-primary)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.filter = 'brightness(1.2)';
                              const tooltip = e.currentTarget.parentElement.querySelector('.bar-tooltip');
                              if (tooltip) tooltip.style.opacity = 1;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.filter = 'none';
                              const tooltip = e.currentTarget.parentElement.querySelector('.bar-tooltip');
                              if (tooltip) tooltip.style.opacity = 0;
                            }}
                          />
                        </div>
                        {/* X Label */}
                        <span style={{ fontSize: '0.65rem', color: isPeak ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '8px', fontWeight: isPeak ? 'bold' : 'normal' }}>
                          {isPeak || idx === 0 || idx === stats.horasPico.data.length - 1 ? h.label : (h.hora > 12 ? h.hora - 12 : h.hora)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No hay datos de afluencia suficientes.
                  </div>
                )}
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
