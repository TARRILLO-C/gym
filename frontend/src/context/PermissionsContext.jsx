import React, { createContext, useContext, useState, useEffect } from 'react';
import { tienePermiso, tieneAlgunPermiso } from '../services/permissions';

export const PermissionsContext = createContext(null);

/**
 * Proveedor de permisos reactivo — expone los permisos del usuario actual del sistema RBAC
 * y permite refrescarlos dinámicamente al iniciar o cerrar sesión.
 */
export const PermissionsProvider = ({ children }) => {
  const [permisos, setPermisos] = useState(() => {
    try {
      const raw = sessionStorage.getItem('permisos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Escuchar cambios locales para sincronización básica
  const refreshPermisos = () => {
    try {
      const raw = sessionStorage.getItem('permisos');
      setPermisos(raw ? JSON.parse(raw) : []);
    } catch {
      setPermisos([]);
    }
  };

  const can = (permiso) => tienePermiso(permisos, permiso);
  const canAny = (...requeridos) => tieneAlgunPermiso(permisos, ...requeridos);

  return (
    <PermissionsContext.Provider value={{ permisos, can, canAny, refreshPermisos }}>
      {children}
    </PermissionsContext.Provider>
  );
};

/** Hook para consumir el contexto de permisos */
export const usePermissions = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions debe usarse dentro de <PermissionsProvider>');
  return ctx;
};
