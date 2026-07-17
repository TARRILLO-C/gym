import React, { useContext, useState, useEffect, useRef } from 'react';
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
import api, { API_BASE_URL } from '../services/api';

const Sidebar = () => {
  const { isDarkMode, toggleTheme, accentTheme, setAccentTheme, accents } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [globalNotification, setGlobalNotification] = useState(null);
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

  const pendingCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
      
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          
          osc2.start(audioCtx.currentTime);
          osc2.stop(audioCtx.currentTime + 0.4);
        } catch (e) {}
      }, 100);
    } catch (e) {}
  };

  useEffect(() => {
    if (role !== 'ADMINISTRADOR' && role !== 'RECEPCIONISTA') return;

    const fetchPendingCounts = async () => {
      try {
        const [prodRes, membRes] = await Promise.all([
          api.get('/solicitudes-producto/pendientes'),
          api.get('/solicitudes-membresia/pendientes')
        ]);
        
        let count = 0;
        if (prodRes.data) {
          count += prodRes.data.length;
        }
        if (membRes.data) {
          count += membRes.data.length;
        }

        if (count > pendingCountRef.current) {
          if (!isInitialLoadRef.current) {
            playAlertSound();
          }
          if (window.location.pathname !== '/solicitudes') {
            setGlobalNotification({
              message: '🔔 ¡Nueva Solicitud Recibida!',
              description: `Tiene ${count} solicitud(es) esperando aprobación.`
            });
          }
        }
        pendingCountRef.current = count;
        setPendingCount(count);
        isInitialLoadRef.current = false;
      } catch (err) {
        console.error('Error fetching pending counts:', err);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 15000);
    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    if (pendingCount > 0) {
      const originalTitle = document.title;
      let isFlashed = false;
      const interval = setInterval(() => {
        document.title = isFlashed ? originalTitle : `(⚠️ ${pendingCount} Solicitud(es) Pendiente(s)) ${originalTitle}`;
        isFlashed = !isFlashed;
      }, 1500);

      return () => {
        document.title = originalTitle;
        clearInterval(interval);
      };
    }
  }, [pendingCount]);

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

        {pendingCount > 0 && window.location.pathname !== '/solicitudes' && (
          <div 
            style={{
              margin: '12px 16px',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              cursor: 'pointer',
              animation: 'pulse-border-red 2s infinite',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
            }}
            onClick={() => {
              setIsMobileOpen(false);
              navigate('/solicitudes');
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                boxShadow: '0 0 8px #ef4444'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '800' }}>
                  {pendingCount} Solicitud(es) pendiente(s)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', opacity: 0.85 }}>
                  Clic para atender
                </span>
              </div>
            </div>
            <FileText size={18} color="#ef4444" style={{ opacity: 0.8 }} />
          </div>
        )}

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
                  top: '-5px',
                  right: '-5px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  border: '1.5px solid var(--panel-bg, #0f172a)',
                  boxShadow: '0 0 8px #ef4444',
                  animation: 'pulse-badge-red 1.5s infinite',
                  zIndex: 2
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
        @keyframes pulse-badge-red {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }
        .global-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid var(--accent-primary);
          border-left: 5px solid var(--accent-primary);
          border-radius: 12px;
          padding: 16px 36px 16px 20px;
          color: white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 16px;
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          max-width: 420px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .global-toast:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
        }
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse-border-red {
          0% {
            border-color: rgba(239, 68, 68, 0.35);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
          }
          50% {
            border-color: rgba(239, 68, 68, 0.8);
            box-shadow: 0 4px 16px rgba(239, 68, 68, 0.25);
          }
          100% {
            border-color: rgba(239, 68, 68, 0.35);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
          }
        }
      `}} />
    </aside>

    {/* Global Toast Notification */}
    {globalNotification && (
      <div 
        className="global-toast" 
        onClick={() => { navigate('/solicitudes'); setGlobalNotification(null); }}
        title="Ver Solicitudes"
      >
        <div style={{
          background: 'rgba(255, 62, 62, 0.1)',
          borderRadius: '50%',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 62, 62, 0.2)',
          flexShrink: 0
        }}>
          <FileText size={20} color="var(--accent-primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '2px', color: '#f8fafc' }}>
            {globalNotification.message}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.3' }}>
            {globalNotification.description}
          </div>
        </div>
        <button 
          style={{
            background: 'var(--accent-primary)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginRight: '8px'
          }}
        >
          Revisar
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setGlobalNotification(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    )}
    </>
  );
};

export default Sidebar;
