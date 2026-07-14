/**
 * RBAC — Definición de permisos del sistema
 * Cada permiso tiene la forma  "modulo:accion"
 */

export const PERMISOS = {
  // Dashboard
  DASHBOARD_VER:          'dashboard:ver',

  // Socios
  SOCIOS_VER:             'socios:ver',
  SOCIOS_CREAR:           'socios:crear',
  SOCIOS_EDITAR:          'socios:editar',
  SOCIOS_ELIMINAR:        'socios:eliminar',

  // Membresías
  MEMBRESIAS_VER:         'membresias:ver',
  MEMBRESIAS_CREAR:       'membresias:crear',
  MEMBRESIAS_EDITAR:      'membresias:editar',
  MEMBRESIAS_ELIMINAR:    'membresias:eliminar',

  // Productos
  PRODUCTOS_VER:          'productos:ver',
  PRODUCTOS_CREAR:        'productos:crear',
  PRODUCTOS_EDITAR:       'productos:editar',
  PRODUCTOS_ELIMINAR:     'productos:eliminar',

  // Ventas
  VENTAS_VER:             'ventas:ver',
  VENTAS_CREAR:           'ventas:crear',
  VENTAS_ANULAR:          'ventas:anular',

  // Control de Acceso / Asistencia
  ASISTENCIA_VER:         'asistencia:ver',
  ASISTENCIA_REGISTRAR:   'asistencia:registrar',

  // Solicitudes
  SOLICITUDES_VER:        'solicitudes:ver',
  SOLICITUDES_APROBAR:    'solicitudes:aprobar',

  // Monitor de Caja
  CAJA_VER:               'caja:ver',
  CAJA_OPERAR:            'caja:operar',

  // Catálogo Web
  CATALOGO_VER:           'catalogo:ver',
  CATALOGO_EDITAR:        'catalogo:editar',

  // Gestión de Personal
  PERSONAL_VER:           'personal:ver',
  PERSONAL_CREAR:         'personal:crear',
  PERSONAL_EDITAR:        'personal:editar',
  PERSONAL_DESACTIVAR:    'personal:desactivar',
};

/** Todos los permisos posibles como array */
export const TODOS_LOS_PERMISOS = Object.values(PERMISOS);

/** Permisos predeterminados por rol */
export const PERMISOS_POR_ROL = {
  ADMINISTRADOR: TODOS_LOS_PERMISOS,

  RECEPCIONISTA: [
    PERMISOS.ASISTENCIA_VER,
    PERMISOS.ASISTENCIA_REGISTRAR,
    PERMISOS.SOCIOS_VER,
    PERMISOS.SOCIOS_CREAR,
    PERMISOS.SOCIOS_EDITAR,
    PERMISOS.MEMBRESIAS_VER,
    PERMISOS.MEMBRESIAS_CREAR,
    PERMISOS.PRODUCTOS_VER,
    PERMISOS.VENTAS_VER,
    PERMISOS.VENTAS_CREAR,
    PERMISOS.SOLICITUDES_VER,
    PERMISOS.SOLICITUDES_APROBAR,
    PERMISOS.CATALOGO_VER,
  ],
};

/**
 * Agrupa los permisos por módulo para mostrarlos en la UI.
 * Cada grupo tiene: id, label, icon, permisos[]
 */
export const GRUPOS_PERMISOS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    permisos: [
      { key: PERMISOS.DASHBOARD_VER, label: 'Ver Dashboard' },
    ],
  },
  {
    id: 'asistencia',
    label: 'Control de Acceso',
    icon: '🛡️',
    permisos: [
      { key: PERMISOS.ASISTENCIA_VER,       label: 'Ver módulo' },
      { key: PERMISOS.ASISTENCIA_REGISTRAR,  label: 'Registrar ingresos' },
    ],
  },
  {
    id: 'socios',
    label: 'Socios',
    icon: '👥',
    permisos: [
      { key: PERMISOS.SOCIOS_VER,      label: 'Ver' },
      { key: PERMISOS.SOCIOS_CREAR,    label: 'Crear' },
      { key: PERMISOS.SOCIOS_EDITAR,   label: 'Editar' },
      { key: PERMISOS.SOCIOS_ELIMINAR, label: 'Eliminar' },
    ],
  },
  {
    id: 'membresias',
    label: 'Membresías',
    icon: '💳',
    permisos: [
      { key: PERMISOS.MEMBRESIAS_VER,      label: 'Ver' },
      { key: PERMISOS.MEMBRESIAS_CREAR,    label: 'Crear' },
      { key: PERMISOS.MEMBRESIAS_EDITAR,   label: 'Editar' },
      { key: PERMISOS.MEMBRESIAS_ELIMINAR, label: 'Eliminar' },
    ],
  },
  {
    id: 'productos',
    label: 'Productos',
    icon: '📦',
    permisos: [
      { key: PERMISOS.PRODUCTOS_VER,      label: 'Ver' },
      { key: PERMISOS.PRODUCTOS_CREAR,    label: 'Crear' },
      { key: PERMISOS.PRODUCTOS_EDITAR,   label: 'Editar' },
      { key: PERMISOS.PRODUCTOS_ELIMINAR, label: 'Eliminar' },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    icon: '🧾',
    permisos: [
      { key: PERMISOS.VENTAS_VER,    label: 'Ver' },
      { key: PERMISOS.VENTAS_CREAR,  label: 'Crear venta' },
      { key: PERMISOS.VENTAS_ANULAR, label: 'Anular venta' },
    ],
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    icon: '📋',
    permisos: [
      { key: PERMISOS.SOLICITUDES_VER,    label: 'Ver' },
      { key: PERMISOS.SOLICITUDES_APROBAR, label: 'Aprobar/Rechazar' },
    ],
  },
  {
    id: 'caja',
    label: 'Monitor de Caja',
    icon: '💰',
    permisos: [
      { key: PERMISOS.CAJA_VER,    label: 'Ver monitor' },
      { key: PERMISOS.CAJA_OPERAR, label: 'Operar caja' },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo Web',
    icon: '🛒',
    permisos: [
      { key: PERMISOS.CATALOGO_VER,    label: 'Ver' },
      { key: PERMISOS.CATALOGO_EDITAR, label: 'Editar configuración' },
    ],
  },
  {
    id: 'personal',
    label: 'Gestión de Personal',
    icon: '⚙️',
    permisos: [
      { key: PERMISOS.PERSONAL_VER,        label: 'Ver' },
      { key: PERMISOS.PERSONAL_CREAR,      label: 'Crear usuario' },
      { key: PERMISOS.PERSONAL_EDITAR,     label: 'Editar usuario' },
      { key: PERMISOS.PERSONAL_DESACTIVAR, label: 'Desactivar usuario' },
    ],
  },
];

/** Verifica si un usuario tiene un permiso específico */
export const tienePermiso = (permisos, permiso) => {
  if (!Array.isArray(permisos)) return false;
  return permisos.includes(permiso);
};

/** Verifica si un usuario tiene al menos uno de los permisos dados */
export const tieneAlgunPermiso = (permisos, ...requeridos) => {
  return requeridos.some(p => tienePermiso(permisos, p));
};
