import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Package,
  Dumbbell,
  Sun,
  Moon,
  LogOut,
  Receipt
} from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

const Sidebar = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Control de Acceso', path: '/asistencia', icon: ShieldCheck },
    { name: 'Socios', path: '/socios', icon: Users },
    { name: 'Membresías', path: '/membresias', icon: CreditCard },
    { name: 'Productos', path: '/productos', icon: Package },
    { name: 'Ventas', path: '/ventas', icon: Receipt },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ 
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          padding: '10px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Dumbbell size={24} color="white" />
        </div>
        <h1 className="sidebar-text" style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
          THE <span className="text-gradient">JUNGLE</span>
        </h1>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} className="nav-icon" />
            <span className="sidebar-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={toggleTheme} 
          className="nav-link theme-btn"
        >
          {isDarkMode ? <Sun size={20} className="nav-icon" /> : <Moon size={20} className="nav-icon" />}
          <span className="sidebar-text">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </button>

        <button 
          onClick={handleLogout} 
          className="nav-link logout-btn"
        >
          <LogOut size={20} />
          <span className="sidebar-text">Cerrar Sesión</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-link:hover {
          background: rgba(150, 150, 150, 0.1);
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
