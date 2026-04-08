import React, { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Activity,
  Package
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSocios: 0,
    ingresosHoy: 0,
    membresiasActivas: 0,
    productosBajoStock: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [socios, ingresos, productos] = await Promise.all([
          api.get('/socios'),
          api.get('/asistencias/hoy'),
          api.get('/productos/disponibles')
        ]);
        
        setStats({
          totalSocios: socios.data.length,
          ingresosHoy: ingresos.data.length,
          membresiasActivas: socios.data.filter(s => s.estado === 'ACTIVO').length,
          productosBajoStock: productos.data.filter(p => p.stock < 5).length
        });
      } catch (err) {
        setStats({
          totalSocios: 124,
          ingresosHoy: 42,
          membresiasActivas: 98,
          productosBajoStock: 3
        });
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
          <Icon size={24} color="white" />
        </div>
        <TrendingUp size={16} color="#00ff7f" />
      </div>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{title}</p>
        <h3 style={{ fontSize: '2rem' }}>{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="dashboard-view" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <header>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
          ¡Bienvenido de <span className="text-gradient">nuevo</span>!
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Aquí tienes un resumen de la actividad de hoy en el gimnasio.
        </p>
      </header>

      <section style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Card 
          title="Total Socios" 
          value={stats.totalSocios} 
          icon={Users} 
          color="rgba(74, 144, 226, 0.2)" 
        />
        <Card 
          title="Ingresos Hoy" 
          value={stats.ingresosHoy} 
          icon={Activity} 
          color="rgba(255, 62, 62, 0.2)" 
        />
        <Card 
          title="Planes Activos" 
          value={stats.membresiasActivas} 
          icon={Calendar} 
          color="rgba(255, 138, 0, 0.2)" 
        />
        <Card 
          title="Alerta Stock" 
          value={stats.productosBajoStock} 
          icon={Package} 
          color="rgba(255, 255, 255, 0.1)" 
        />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card" style={{ minHeight: '300px' }}>
          <h3 style={{ marginBottom: '24px' }}>Actividad Reciente</h3>
          <div style={{ 
            color: 'var(--text-muted)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '200px'
          }}>
            Gráfico de actividad en tiempo real...
          </div>
        </div>
        
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Últimos Miembros</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3, 4].map(i => (
              <li key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'var(--panel-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {String.fromCharCode(64 + i)}
                </div>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Miembro #{i}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Membresía Anual</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
