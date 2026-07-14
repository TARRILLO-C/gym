import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Asistencia from './views/Asistencia';
import Socios from './views/Socios';
import Membresias from './views/Membresias';
import Productos from './views/Productos';
import Ventas from './views/Ventas';
import Usuarios from './views/Usuarios';
import Login from './views/Login';
import ConfiguracionCatalogo from './views/ConfiguracionCatalogo';
import CatalogoVirtual from './views/CatalogoVirtual';
import SolicitudesMembresia from './views/SolicitudesMembresia';
import MonitorCaja from './views/MonitorCaja';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { PermissionsProvider } from './context/PermissionsContext';
import './App.css';


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="card glass" style={{margin: '20px', padding: '40px', textAlign: 'center'}}><h2>Algo salió mal al cargar esta vista.</h2><button className="btn-primary" onClick={() => window.location.reload()} style={{marginTop: '20px'}}>RECARGAR PÁGINA</button></div>;
    return this.props.children;
  }
}

const AppLayout = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isCatalogoPage = location.pathname === '/catalogo';
  const isPublicPage = isLoginPage || isCatalogoPage;

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      {!isPublicPage && <Sidebar />}
      <main className="main-content" style={isPublicPage ? { width: '100%', maxWidth: 'none', marginLeft: 0, padding: 0 } : {}}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/catalogo" element={<CatalogoVirtual />} />
            
            <Route path="/" element={<ProtectedRoute requiredPermission="dashboard:ver"><Dashboard /></ProtectedRoute>} />
            <Route path="/asistencia" element={<ProtectedRoute requiredPermission="asistencia:ver"><Asistencia /></ProtectedRoute>} />
            <Route path="/solicitudes" element={<ProtectedRoute requiredPermission="solicitudes:ver"><SolicitudesMembresia /></ProtectedRoute>} />
            <Route path="/socios" element={<ProtectedRoute requiredPermission="socios:ver"><Socios /></ProtectedRoute>} />
            <Route path="/membresias" element={<ProtectedRoute requiredPermission="membresias:ver"><Membresias /></ProtectedRoute>} />
            <Route path="/productos" element={<ProtectedRoute requiredPermission="productos:ver"><Productos /></ProtectedRoute>} />
            <Route path="/ventas" element={<ProtectedRoute requiredPermission="ventas:ver"><Ventas /></ProtectedRoute>} />
            <Route path="/monitor-caja" element={<ProtectedRoute requiredPermission="caja:ver"><MonitorCaja /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requiredPermission="personal:ver"><Usuarios /></ProtectedRoute>} />
            <Route path="/configuracion-catalogo" element={<ProtectedRoute requiredPermission="catalogo:editar"><ConfiguracionCatalogo /></ProtectedRoute>} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <Router>
          <AppLayout />
        </Router>
      </PermissionsProvider>
    </ThemeProvider>
  );
}

export default App;
