import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../context/PermissionsContext';

/**
 * Componente de ruta protegida.
 * Valida si el usuario está autenticado y si cumple con el rol o el permiso granular requerido.
 */
const ProtectedRoute = ({ children, requiredPermission, allowedRoles }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  const role = sessionStorage.getItem('role');
  const { can } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Validar permiso granular si se especifica
  if (requiredPermission && !can(requiredPermission)) {
    console.warn(`Acceso denegado: Se requiere el permiso '${requiredPermission}'`);
    return (
      <div className="card glass" style={{ margin: '40px', padding: '45px', textAlign: 'center', color: '#ef4444' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px', fontWeight: 'bold' }}>🛡️ Acceso Denegado</h2>
        <p style={{ color: 'var(--text-color)', opacity: 0.8 }}>No tienes los permisos requeridos para visualizar este módulo ({requiredPermission}).</p>
        <p style={{ fontSize: '14px', marginTop: '15px', color: '#888' }}>Comunícate con el administrador para solicitar acceso.</p>
      </div>
    );
  }

  // Validar rol por compatibilidad heredada
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(`Acceso denegado: El rol '${role}' no está en el listado permitido.`);
    return (
      <div className="card glass" style={{ margin: '40px', padding: '45px', textAlign: 'center', color: '#ef4444' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px', fontWeight: 'bold' }}>🛡️ Acceso Denegado</h2>
        <p style={{ color: 'var(--text-color)', opacity: 0.8 }}>Tu rol ({role}) no está autorizado para acceder a este módulo.</p>
      </div>
    );
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
