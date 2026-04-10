import React, { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Activity,
  Package
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSocios: 0,
    ingresosHoy: 0,
    membresiasActivas: 0,
    productosBajoStock: 0,
    ultimosMiembros: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [socios, ingresos, productos] = await Promise.all([
          api.get('/socios'),
          api.get('/asistencias/hoy'),
          api.get('/productos/disponibles')
        ]);
        
        setStats({
          totalSocios: socios.data.length || 0,
          ingresosHoy: ingresos.data.length || 0,
          membresiasActivas: socios.data.filter(s => s.estado === 'ACTIVO').length || 0,
          productosBajoStock: productos.data.filter(p => p.stock < 5).length || 0,
          ultimosMiembros: socios.data.slice(-4).reverse() || []
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
      <section style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
          title="Planes Activos" 
          value={stats.membresiasActivas} 
          icon={Calendar} 
          color="rgba(74, 144, 226, 0.8)" 
        />
        <Card 
          title="Alerta Stock" 
          value={stats.productosBajoStock} 
          icon={Package} 
          color="rgba(180, 180, 180, 0.8)" 
        />
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
    </PageLayout>
  );
};

export default Dashboard;
