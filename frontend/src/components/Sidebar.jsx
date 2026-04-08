import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Package,
  Dumbbell
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Control de Acceso', path: '/asistencia', icon: ShieldCheck },
    { name: 'Socios', path: '/socios', icon: Users },
    { name: 'Membresías', path: '/membresias', icon: CreditCard },
    { name: 'Productos', path: '/productos', icon: Package },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          padding: '10px',
          borderRadius: '12px'
        }}>
          <Dumbbell size={24} color="white" />
        </div>
        <h1 className="sidebar-text" style={{ fontSize: '1.5rem', fontWeight: '800' }}>
          GYM<span className="text-gradient">PRO</span>
        </h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-link ${isActive ? 'active' : ''}`
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 20px',
              borderRadius: '14px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'var(--transition-smooth)'
            }}
          >
            <item.icon size={20} className="nav-icon" />
            <span className="sidebar-text" style={{ fontWeight: '500' }}>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
        <p className="sidebar-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          v1.0.0 Stable
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link.active {
          background: rgba(255, 62, 62, 0.1);
          color: var(--accent-primary);
        }
        .nav-link.active .nav-icon {
          color: var(--accent-primary);
        }
        .nav-link:not(.active) .nav-icon {
          color: var(--text-muted);
        }
      `}} />
    </aside>
  );
};

export default Sidebar;
