import React, { useContext, useState, useEffect } from 'react';
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
  UserCog,
  Receipt,
  Store,
  FileText,
  Menu,
  X,
  DollarSign,
  Ban
} from 'lucide-react';
import { usePermissions } from '../context/PermissionsContext';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE_URL } from '../services/api';

const Sidebar = () => {
  const { isDarkMode, toggleTheme, accentTheme, setAccentTheme, accents } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { can } = usePermissions();

  const role = sessionStorage.getItem('role');

  useEffect(() => {
    fetch(`${API_BASE_URL}/web-config`)
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      })
      .catch(err => console.error('Error fetching logo:', err));
  }, []);

  useEffect(() => {
    if (role !== 'ADMINISTRADOR' && role !== 'RECEPCIONISTA') return;

    const fetchPendingCounts = async () => {
      try {
        const [prodRes, membRes] = await Promise.all([
          fetch(`${API_BASE_URL}/solicitudes-producto/pendientes`),
          fetch(`${API_BASE_URL}/solicitudes-membresia/pendientes`)
        ]);
        
        let count = 0;
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          count += prodData.length;
        }
        if (membRes.ok) {
          const membData = await membRes.json();
          count += membData.length;
        }
        setPendingCount(count);
      } catch (err) {
        console.error('Error fetching pending counts:', err);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 15000);
    return () => clearInterval(interval);
  }, [role]);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard:ver' },
    { name: 'Control de Acceso', path: '/asistencia', icon: ShieldCheck, permission: 'asistencia:ver' },
    { name: 'Solicitudes', path: '/solicitudes', icon: FileText, permission: 'solicitudes:ver' },
    { name: 'Socios', path: '/socios', icon: Users, permission: 'socios:ver' },
    { name: 'Membresías', path: '/membresias', icon: CreditCard, permission: 'membresias:ver' },
    { name: 'Productos', path: '/productos', icon: Package, permission: 'productos:ver' },
    { name: 'Ventas', path: '/ventas', icon: Receipt, permission: 'ventas:ver' },
    { name: 'Monitor de Caja', path: '/monitor-caja', icon: DollarSign, permission: 'caja:ver' },
    { name: 'Personal', path: '/usuarios', icon: UserCog, permission: 'personal:ver' },
    { name: 'Catálogo Web', path: '/configuracion-catalogo', icon: Store, permission: 'catalogo:editar' },
  ].filter(item => can(item.permission));

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('permisos');
    navigate('/login');
  };

  return (
    <>
      <div className="mobile-top-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(true)}>
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {logoUrl ? <img src={logoUrl} alt="Logo" style={{ height: '24px', width: '24px', objectFit: 'contain', borderRadius: '4px' }} /> : <Dumbbell size={18} color="var(--accent-primary)" />}
          THE <span className="text-gradient">JUNGLE</span>
        </h1>
      </div>

      {isMobileOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo de la empresa" style={{ height: '40px', width: '40px', objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
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
            )}
            <h1 className="sidebar-text" style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>
              THE <span className="text-gradient">JUNGLE</span>
            </h1>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) => 
              `nav-link ${isActive ? 'active' : ''}`
            }
            style={{ position: 'relative' }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <item.icon size={20} className="nav-icon" />
              {item.name === 'Solicitudes' && pendingCount > 0 && (
                <span className="pending-badge-dot" style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px var(--accent-primary)',
                  display: 'none'
                }} />
              )}
            </div>
            <span className="sidebar-text" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flex: 1,
              width: '100%'
            }}>
              <span>{item.name}</span>
              {item.name === 'Solicitudes' && pendingCount > 0 && (
                <span className="pending-badge" style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px var(--accent-primary)',
                  animation: 'pulse-badge 2s infinite',
                  marginLeft: '8px'
                }}>
                  {pendingCount}
                </span>
              )}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {/* Selector de Acento de Color */}
        {accents && (
          <div className="sidebar-text" style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tema Neón</span>
            <div style={{ display: 'flex', gap: '8px', padding: '4px 0' }}>
              {Object.keys(accents).map((key) => (
                <button
                  key={key}
                  onClick={() => setAccentTheme(key)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: accents[key].primary,
                    border: accentTheme === key ? '2px solid var(--text-main)' : 'none',
                    cursor: 'pointer',
                    boxShadow: accentTheme === key ? `0 0 8px ${accents[key].primary}` : 'none',
                    transition: 'transform 0.2s',
                    transform: accentTheme === key ? 'scale(1.2)' : 'none'
                  }}
                  title={`Tema ${key}`}
                />
              ))}
            </div>
          </div>
        )}

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
        @keyframes pulse-badge {
          0% {
            box-shadow: 0 0 0 0 var(--accent-primary);
          }
          70% {
            box-shadow: 0 0 0 6px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }
        @media (max-width: 1024px) {
          .pending-badge-dot {
            display: block !important;
          }
        }
      `}} />
    </aside>
    </>
  );
};

export default Sidebar;
