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
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

// Componente para capturar errores de renderizado
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

  return (
    <div className="app-container" style={{ display: 'flex' }}>
      {!isLoginPage && <Sidebar />}
      <main className="main-content" style={isLoginPage ? { width: '100%', marginLeft: 0, padding: 0 } : {}}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><Dashboard /></ProtectedRoute>} />
            <Route path="/asistencia" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}><Asistencia /></ProtectedRoute>} />
            <Route path="/socios" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}><Socios /></ProtectedRoute>} />
            <Route path="/membresias" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}><Membresias /></ProtectedRoute>} />
            <Route path="/productos" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}><Productos /></ProtectedRoute>} />
            <Route path="/ventas" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'RECEPCIONISTA']}><Ventas /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']}><Usuarios /></ProtectedRoute>} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  );
}

export default App;
