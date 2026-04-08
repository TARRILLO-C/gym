import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Asistencia from './views/Asistencia';
import Socios from './views/Socios';
import Membresias from './views/Membresias';
import Productos from './views/Productos';
import './App.css';

// Componente para capturar errores de renderizado
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="card" style={{margin: '20px', padding: '40px', textAlign: 'center'}}><h2>Algo salió mal al cargar esta vista.</h2><button className="btn-primary" onClick={() => window.location.reload()} style={{marginTop: '20px'}}>RECARGAR PÁGINA</button></div>;
    return this.props.children;
  }
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/asistencia" element={<Asistencia />} />
            <Route path="/socios" element={<Socios />} />
            <Route path="/membresias" element={<Membresias />} />
            <Route path="/productos" element={<Productos />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;
