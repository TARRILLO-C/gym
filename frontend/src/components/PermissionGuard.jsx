import React from 'react';
import { usePermissions } from '../context/PermissionsContext';

/**
 * Componente Guardián de Permisos.
 * Renderiza sus hijos únicamente si el usuario autenticado posee el permiso especificado en el sistema RBAC.
 * @param {string} permission Permiso requerido (ej. 'ventas:anular').
 * @param {React.ReactNode} fallback Componente opcional a mostrar en caso de no estar autorizado.
 */
const PermissionGuard = ({ children, permission, fallback = null }) => {
  const { can } = usePermissions();

  if (!can(permission)) {
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGuard;
