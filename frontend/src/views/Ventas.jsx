import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Calendar,
  DollarSign,
  Printer,
  Trash2,
  FilePlus,
  Ban,
  TrendingUp,
  Award
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';
import PrintTicket from '../components/ui/PrintTicket';

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('ALL');
  const [ventaToPrint, setVentaToPrint] = useState(null);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [dialogInput, setDialogInput] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [emitForm, setEmitForm] = useState({ ventaId: null, tipo: 'BOLETA', documento: '', nombre: '' });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [activeTab, setActiveTab] = useState('productos');
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const buscarDatos = async (doc, tipo) => {
    const isDni = tipo === 'BOLETA' && doc.length === 8;
    const isRuc = tipo === 'FACTURA' && doc.length === 11;
    if (!isDni && !isRuc) return;

    setLookupLoading(true);
    setLookupError('');
    try {
      const endpoint = isDni ? `/consultas/dni/${doc}` : `/consultas/ruc/${doc}`;
      const resp = await api.get(endpoint);
      const data = resp.data;
      
      const nombre = data.nombreCompleto || data.datos?.nombreCompleto || '';
      
      if (nombre) {
        setEmitForm(prev => ({ ...prev, nombre }));
      } else {
        setLookupError('No se encontraron datos para este número.');
      }
    } catch {
      setLookupError('No se pudo consultar el número. Verifícalo o ingrésalo manualmente.');
    } finally {
      setLookupLoading(false);
    }
  };

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/ventas/productos');
      // Asegurarse de que sea un arreglo.
      setVentas(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error al cargar /ventas:", err);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPagos = async () => {
    setLoadingPagos(true);
    try {
      const resp = await api.get('/pagos');
      setPagos(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error al cargar /pagos:", err);
      setPagos([]);
    } finally {
      setLoadingPagos(false);
    }
  };

  useEffect(() => {
    fetchVentas();
    fetchPagos();
  }, []);

  const handleImprimir = (venta) => {
    setVentaToPrint(venta);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleAnularVenta = (venta) => {
    const ident = venta.serie && venta.correlativo 
      ? `${venta.tipoComprobante} ${venta.serie}-${venta.correlativo}`
      : `Venta Interna #${venta.id}`;

    setDialogInput('');
    setDialogConfig({
      isOpen: true, 
      type: 'confirm', 
      title: 'Anular Comprobante',
      message: `¿Estás seguro que deseas anular la ${ident}? El stock será devuelto (si aplica).`,
      warningText: 'Esta acción reportará la baja a SUNAT y no se puede deshacer.',
      showInput: true,
      inputLabel: 'Motivo de anulación (Obligatorio)',
      inputPlaceholder: 'Ej: Error en los productos, Cliente desistió de la compra...',
      onConfirm: async () => {
        try {
          await api.put(`/ventas/${venta.id}`, { ...venta, activo: false, motivoAnulacion: dialogInput });
          await fetchVentas();
          await fetchPagos();
        } catch (err) { showAlert("Error", "Error al anular venta"); }
      }
    });
  };

  // Removida la función handleRestoreVenta según requerimiento de cambiar a "Emitir Comprobante"

  const handleOpenEmitModal = (ventaId) => {
    setEmitForm({ ventaId, tipo: 'BOLETA', documento: '', nombre: '' });
    setShowEmitModal(true);
  };

  const handleGenerateComprobante = async () => {
    try {
      const doc = emitForm.documento ? emitForm.documento.trim() : '';
      const nom = emitForm.nombre ? emitForm.nombre.trim() : '';
      
      if (emitForm.tipo === 'FACTURA') {
        if (doc.length !== 11 || !/^(10|20)\d{9}$/.test(doc)) {
          showAlert("Error Fiscal", "El RUC debe tener exactamente 11 dígitos y comenzar con 10 o 20.");
          return;
        }
        if (nom === '') {
          showAlert("Error Fiscal", "La Razón Social es obligatoria para emitir Factura.");
          return;
        }
      } else if (emitForm.tipo === 'BOLETA') {
        if (doc.length > 0 && (doc.length !== 8 || !/^\d{8}$/.test(doc))) {
          showAlert("Error de Formato", "Si ingresa un DNI para la boleta, debe ser de exactamente 8 dígitos.");
          return;
        }
      }
      
      const payload = {
        tipo: emitForm.tipo,
        ruc: emitForm.documento,
        razonSocial: emitForm.nombre
      };
      
      await api.post(`/ventas/${emitForm.ventaId}/emitir`, payload);
      
      setDialogConfig({
        isOpen: true, type: 'alert', title: '¡Comprobante Emitido!',
        message: 'El documento ha sido generado exitosamente en SUNAT.'
      });
      setShowEmitModal(false);
      fetchVentas();
      fetchPagos();
    } catch (err) {
      showAlert("Error al emitir", "Hubo un problema al conectar con SUNAT o procesar la petición.");
    }
  };

  const filteredVentas = ventas
    .filter(v => {
      if (filterMode === 'ACTIVO') return v.activo !== false;
      if (filterMode === 'INACTIVO') return v.activo === false;
      return true;
    })
    .filter(v => {
      if (startDate) {
        const sDate = new Date(startDate + 'T00:00:00');
        const vDate = new Date(v.fecha);
        if (vDate < sDate) return false;
      }
      if (endDate) {
        const eDate = new Date(endDate + 'T23:59:59');
        const vDate = new Date(v.fecha);
        if (vDate > eDate) return false;
      }
      return true;
    })
    .filter(v => {
      const term = search.toLowerCase();
      const socioNombre = v.socio?.nombreCompleto?.toLowerCase() || '';
      const clienteNombre = v.clienteNombre?.toLowerCase() || '';
      const clienteDoc = v.clienteDocumento?.toLowerCase() || '';
      const metodo = v.metodoPago?.toLowerCase() || '';
      const idStr = String(v.id);
      return socioNombre.includes(term) || clienteNombre.includes(term) || clienteDoc.includes(term) || metodo.includes(term) || idStr.includes(term);
    });

  const filteredPagos = pagos
    .filter(p => {
      if (filterMode === 'ACTIVO') return p.venta?.activo !== false;
      if (filterMode === 'INACTIVO') return p.venta?.activo === false;
      return true;
    })
    .filter(p => {
      if (startDate) {
        const sDate = new Date(startDate + 'T00:00:00');
        const pDate = new Date(p.fechaPago);
        if (pDate < sDate) return false;
      }
      if (endDate) {
        const eDate = new Date(endDate + 'T23:59:59');
        const pDate = new Date(p.fechaPago);
        if (pDate > eDate) return false;
      }
      return true;
    })
    .filter(p => {
      const term = search.toLowerCase();
      const socioNombre = p.suscripcion?.socio?.nombreCompleto?.toLowerCase() || '';
      const planNombre = p.suscripcion?.membresia?.nombre?.toLowerCase() || '';
      const metodo = p.metodoPago?.toLowerCase() || '';
      const comentario = p.comentario?.toLowerCase() || '';
      return socioNombre.includes(term) || planNombre.includes(term) || metodo.includes(term) || comentario.includes(term);
    });

  const productoRanking = useMemo(() => {
    const counts = {};
    (ventas || []).forEach(v => {
      if (v.activo === false) return;
      (v.detalles || []).forEach(d => {
        const nombre = d.producto?.nombre || 'Producto sin nombre';
        counts[nombre] = (counts[nombre] || 0) + (d.cantidad || 0);
      });
    });
    return Object.entries(counts)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [ventas]);

  const suscripcionRanking = useMemo(() => {
    const counts = {};
    (pagos || []).forEach(p => {
      if (p.venta?.activo === false) return;
      const nombre = p.suscripcion?.membresia?.nombre || 'Plan sin nombre';
      counts[nombre] = (counts[nombre] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }, [pagos]);

  return (<>
    <PageLayout
      title={<span>Historial de <span className="text-gradient">Ventas</span></span>}
      subtitle="Revisa todas las transacciones realizadas en el gimnasio."
    >
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('productos')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'productos' ? 'var(--accent-primary)' : 'var(--panel-bg)',
            color: activeTab === 'productos' ? 'white' : 'var(--text-main)',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: activeTab === 'productos' ? '0 4px 12px rgba(255, 62, 62, 0.2)' : 'none'
          }}
        >
          Ventas de Productos
        </button>
        <button 
          onClick={() => setActiveTab('planes')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'planes' ? 'var(--accent-primary)' : 'var(--panel-bg)',
            color: activeTab === 'planes' ? 'white' : 'var(--text-main)',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: activeTab === 'planes' ? '0 4px 12px rgba(255, 62, 62, 0.2)' : 'none'
          }}
        >
          Ventas de Planes (Suscripciones)
        </button>
      </div>

      <div className="card" style={{ padding: '0 24px 24px' }}>
        <div style={{ display: 'flex', gap: 12, paddingBottom: 20, paddingTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: 10, padding: 3, gap: 3 }}>
            <button onClick={() => setFilterMode('ALL')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: filterMode === 'ALL' ? 'var(--panel-border)' : 'transparent', color: filterMode === 'ALL' ? 'var(--text-main)' : 'var(--text-muted)', transition: 'all .2s' }}>Todos</button>
            <button onClick={() => setFilterMode('ACTIVO')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: filterMode === 'ACTIVO' ? '#22c55e20' : 'transparent', color: filterMode === 'ACTIVO' ? '#22c55e' : 'var(--text-muted)', transition: 'all .2s' }}>Válidas</button>
            <button onClick={() => setFilterMode('INACTIVO')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: filterMode === 'INACTIVO' ? '#ef444420' : 'transparent', color: filterMode === 'INACTIVO' ? '#ef4444' : 'var(--text-muted)', transition: 'all .2s' }}>Anuladas</button>
          </div>

          <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s_]/g, ''))} placeholder={activeTab === 'productos' ? "Buscar por socio o método de pago..." : "Buscar por socio, membresía o método..."} style={{ paddingLeft: 36, width: '100%', borderRadius: 10, padding: '9px 12px 9px 36px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { const d = new Date(); setStartDate(d.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Hoy</button>
            <button onClick={() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const from = new Date(d.setDate(diff)); const to = new Date(); setStartDate(from.toISOString().split('T')[0]); setEndDate(to.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Semana</button>
            <button onClick={() => { const d = new Date(); const from = new Date(d); from.setDate(d.getDate() - 30); setStartDate(from.toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>30 Días</button>
            <button onClick={() => { const d = new Date(); setStartDate(new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]); setEndDate(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Año</button>
            <div style={{ width: '1px', height: '28px', background: 'var(--panel-border)', margin: '0 4px' }} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
            {(search || startDate || endDate) && (
              <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,62,62,0.1)', color: '#ff3e3e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }} title="Limpiar filtros">
                <Ban size={16} />
              </button>
            )}
          </div>
        </div>

        {activeTab === 'productos' ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando historial...</div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>MÉTODO PAGO</th>
                  <th>TOTAL</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredVentas.map(venta => (
                  <tr key={venta.id} style={{ opacity: venta.activo === false ? 0.55 : 1 }}>
                    <td data-label="ID" style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '2px' }}>{venta.tipoComprobante}</div>
                      <div>{venta.serie && venta.correlativo ? `${venta.serie}-${venta.correlativo}` : `#${venta.id}`}</div>
                    </td>
                    <td data-label="FECHA">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {new Date(venta.fecha).toLocaleString()}
                      </div>
                    </td>
                    <td data-label="CLIENTE">
                      <div style={{ fontWeight: '600' }}>{venta.socio?.nombreCompleto || venta.clienteNombre || 'Cliente General'}</div>
                    </td>
                    <td data-label="MÉTODO PAGO">
                      <span className="badge" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        {venta.metodoPago}
                      </span>
                    </td>
                    <td data-label="TOTAL" style={{ fontWeight: '800', color: 'var(--accent-primary)' }}>
                      S/ {parseFloat(venta.total).toFixed(2)}
                    </td>
                    <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {venta.activo !== false ? (
                          <>
                            {venta.enlacePdfTicket ? (
                              <>
                                <button
                                  onClick={() => window.open(venta.enlacePdfTicket, '_blank')}
                                  title="Ver Ticket de Venta (80mm)"
                                  style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  <Printer size={18} />
                                </button>
                                <button
                                  onClick={() => window.open(venta.enlacePdfA4, '_blank')}
                                  title="Ver PDF (A4)"
                                  style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-main)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  <FileText size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleImprimir(venta)}
                                  title="Reimprimir Comprobante Interno"
                                  style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                  <Printer size={18} />
                                </button>
                                {venta.tipoComprobante === 'NOTA_VENTA' && (
                                  <button
                                    onClick={() => handleOpenEmitModal(venta.id)}
                                    title="Emitir Comprobante"
                                    style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                  >
                                    <FilePlus size={18} />
                                  </button>
                                )}
                              </>
                            )}
                            <button 
                              onClick={() => handleAnularVenta(venta)}
                              title="Anular Comprobante"
                              style={{ background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                            >
                              <Ban size={18} />
                            </button>
                          </>
                        ) : (
                          <span className="badge badge-inactive" style={{ background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e' }}>
                            ANULADA
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVentas.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No se encontraron ventas con este criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        ) : (
          loadingPagos ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando pagos de planes...</div>
          ) : (
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>FECHA</th>
                  <th>SOCIO</th>
                  <th>PLAN / MEMBRESÍA</th>
                  <th>MÉTODO PAGO</th>
                  <th>MONTO</th>
                  <th>COMENTARIO</th>
                  <th style={{ textAlign: 'right' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagos.map(pago => (
                  <tr key={pago.id} style={{ opacity: (pago.venta && pago.venta.activo === false) ? 0.55 : 1 }}>
                    <td data-label="ID" style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
                      #{pago.id}
                    </td>
                    <td data-label="FECHA">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {new Date(pago.fechaPago).toLocaleString()}
                      </div>
                    </td>
                    <td data-label="SOCIO">
                      <div style={{ fontWeight: '600' }}>{pago.suscripcion?.socio?.nombreCompleto || 'Desconocido'}</div>
                    </td>
                    <td data-label="PLAN / MEMBRESÍA" style={{ fontWeight: '600', color: 'var(--accent-secondary)' }}>
                      {pago.suscripcion?.membresia?.nombre || 'Plan Especial'}
                    </td>
                    <td data-label="MÉTODO PAGO">
                      <span className="badge" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}>
                        {pago.metodoPago}
                      </span>
                    </td>
                    <td data-label="MONTO" style={{ fontWeight: '800', color: '#00ff7f' }}>
                      S/ {parseFloat(pago.monto).toFixed(2)}
                    </td>
                    <td data-label="COMENTARIO" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {pago.comentario || '-'}
                    </td>
                    <td data-label="ACCIONES" style={{ textAlign: 'right' }}>
                      {pago.venta ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {pago.venta.activo !== false ? (
                            <>
                              {pago.venta.enlacePdfTicket ? (
                                <>
                                  <button
                                    onClick={() => window.open(pago.venta.enlacePdfTicket, '_blank')}
                                    title="Ver Ticket de Venta (80mm)"
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                  >
                                    <Printer size={18} />
                                  </button>
                                  <button
                                    onClick={() => window.open(pago.venta.enlacePdfA4, '_blank')}
                                    title="Ver PDF (A4)"
                                    style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-main)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                  >
                                    <FileText size={18} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleImprimir(pago.venta)}
                                    title="Reimprimir Comprobante Interno"
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                  >
                                    <Printer size={18} />
                                  </button>
                                  {pago.venta.tipoComprobante === 'NOTA_VENTA' && (
                                    <button
                                      onClick={() => handleOpenEmitModal(pago.venta.id)}
                                      title="Emitir Comprobante"
                                      style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                      <FilePlus size={18} />
                                    </button>
                                  )}
                                </>
                              )}
                              <button 
                                onClick={() => handleAnularVenta(pago.venta)}
                                title="Anular Comprobante"
                                style={{ background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                              >
                                <Ban size={18} />
                              </button>
                            </>
                          ) : (
                            <span className="badge badge-inactive" style={{ background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e' }}>
                              ANULADA
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin comprobante</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPagos.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No se encontraron pagos de planes con este criterio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Ranquin de productos más vendidos */}
      <div className="card" style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <TrendingUp size={22} color="#f97316" />
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Ranquin de productos más vendidos</h3>
        </div>
        {productoRanking.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No hay datos de ventas de productos.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {productoRanking.map((item, idx) => (
              <div key={item.nombre} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--panel-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', background: idx === 0 ? '#f97316' : idx === 1 ? '#64748b' : idx === 2 ? '#92400e' : 'var(--panel-border)', color: idx < 3 ? '#fff' : 'var(--text-muted)' }}>{idx + 1}</div>
                <div style={{ flex: 1, fontWeight: 600, color: 'var(--text-main)' }}>{item.nombre}</div>
                <div style={{ fontWeight: 700, color: '#f97316', fontSize: '0.95rem' }}>{item.cantidad} vendidos</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ranquin de suscripciones más vendidas */}
      <div className="card" style={{ marginTop: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Award size={22} color="#a78bfa" />
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700, fontSize: '1.1rem' }}>Ranquin de suscripciones más vendidas</h3>
        </div>
        {suscripcionRanking.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No hay datos de suscripciones.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suscripcionRanking.map((item, idx) => (
              <div key={item.nombre} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--panel-bg)', borderRadius: 10, border: '1px solid var(--panel-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', background: idx === 0 ? '#a78bfa' : idx === 1 ? '#64748b' : idx === 2 ? '#92400e' : 'var(--panel-border)', color: idx < 3 ? '#fff' : 'var(--text-muted)' }}>{idx + 1}</div>
                <div style={{ flex: 1, fontWeight: 600, color: 'var(--text-main)' }}>{item.nombre}</div>
                <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.95rem' }}>{item.cantidad} ventas</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
    <PrintTicket venta={ventaToPrint} />
    
    <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{dialogConfig.message}</p>
        
        {dialogConfig.warningText && (
          <p style={{ color: '#ff3e3e', fontSize: '0.85rem', fontWeight: 'bold', margin: 0, padding: '8px', background: 'rgba(255, 62, 62, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ff3e3e' }}>
            ⚠️ {dialogConfig.warningText}
          </p>
        )}

        {dialogConfig.showInput && (
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>{dialogConfig.inputLabel}</label>
            <input 
              type="text" 
              value={dialogInput} 
              onChange={(e) => setDialogInput(e.target.value)} 
              placeholder={dialogConfig.inputPlaceholder} 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', color: 'var(--text-main)' }} 
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          {dialogConfig.type !== 'alert' && (
            <button onClick={() => setDialogConfig({ isOpen: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Cancelar
            </button>
          )}
          <button 
            className="btn-primary" 
            disabled={dialogConfig.showInput && dialogInput.trim().length === 0}
            onClick={() => {
              if(dialogConfig.type === 'confirm') dialogConfig.onConfirm();
              setDialogConfig({ isOpen: false });
            }} 
            style={{ padding: '10px 24px', opacity: (dialogConfig.showInput && dialogInput.trim().length === 0) ? 0.5 : 1, cursor: (dialogConfig.showInput && dialogInput.trim().length === 0) ? 'not-allowed' : 'pointer' }}
          >
            {dialogConfig.type === 'alert' ? 'Aceptar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>

    {/* Custom Modal: Emitir Comprobante Electrónico */}
    <Modal isOpen={showEmitModal} onClose={() => setShowEmitModal(false)} title="Emitir Comprobante Electrónico">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>
          ¿Qué tipo de comprobante deseas emitir para la Nota de Venta <span style={{fontWeight: 'bold', color: 'var(--accent-primary)'}}>#{emitForm.ventaId}</span>?
        </p>

        {/* Lógica Visual: Selector Toggles (Radio simulado) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div 
            onClick={() => setEmitForm({...emitForm, tipo: 'BOLETA', documento: '', nombre: ''})}
            style={{ 
              padding: '16px', borderRadius: '16px', border: emitForm.tipo === 'BOLETA' ? '2px solid #f97316' : '1px solid var(--panel-border)', 
              background: emitForm.tipo === 'BOLETA' ? 'rgba(249, 115, 22, 0.05)' : 'var(--panel-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' 
            }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: emitForm.tipo === 'BOLETA' ? '6px solid #f97316' : '2px solid var(--text-muted)', transition: 'all 0.2s' }}></div>
            <span style={{ fontWeight: 'bold', color: emitForm.tipo === 'BOLETA' ? '#f97316' : 'var(--text-main)' }}>Boleta</span>
          </div>
          
          <div 
            onClick={() => setEmitForm({...emitForm, tipo: 'FACTURA', documento: '', nombre: ''})}
            style={{ 
              padding: '16px', borderRadius: '16px', border: emitForm.tipo === 'FACTURA' ? '2px solid #f97316' : '1px solid var(--panel-border)', 
              background: emitForm.tipo === 'FACTURA' ? 'rgba(249, 115, 22, 0.05)' : 'var(--panel-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' 
            }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: emitForm.tipo === 'FACTURA' ? '6px solid #f97316' : '2px solid var(--text-muted)', transition: 'all 0.2s' }}></div>
            <span style={{ fontWeight: 'bold', color: emitForm.tipo === 'FACTURA' ? '#f97316' : 'var(--text-main)' }}>Factura</span>
          </div>
        </div>

        {/* Renderizado dinámico para FACTURA o BOLETA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--panel-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--panel-border)', animation: 'fadeIn 0.3s ease-out' }}>
          {emitForm.tipo === 'BOLETA' && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              💡 Nota: Si dejas <strong>ambos campos vacíos</strong>, la Boleta se emitirá oficialmente a favor de <strong>"PÚBLICO GENERAL"</strong> (DNI: 00000000). Si el cliente desea la boleta a su nombre, llénalos aquí:
            </p>
          )}

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>
              {emitForm.tipo === 'FACTURA' ? 'Ingrese el RUC del cliente (Obligatorio)' : 'Ingrese el DNI del cliente (Opcional)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={emitForm.documento} 
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setEmitForm(prev => ({ ...prev, documento: val, nombre: '' }));
                  setLookupError('');
                  buscarDatos(val, emitForm.tipo);
                }}
                maxLength={emitForm.tipo === 'FACTURA' ? "11" : "8"}
                placeholder={emitForm.tipo === 'FACTURA' ? "Ej: 20601234567" : "Ej: 71234567"} 
                style={{ width: '100%', padding: '14px', paddingRight: lookupLoading ? '48px' : '14px', borderRadius: '12px', background: 'var(--bg-color)', border: emitForm.tipo === 'FACTURA' ? '1px solid #f97316' : '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '1rem', boxSizing: 'border-box' }} 
              />
              {lookupLoading && (
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#f97316', fontWeight: 'bold', whiteSpace: 'nowrap' }}>⏳ Buscando...</span>
              )}
            </div>
            {lookupError && (
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#ff3e3e' }}>⚠️ {lookupError}</p>
            )}
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 'bold' }}>
              {emitForm.tipo === 'FACTURA' ? 'Razón Social (Obligatorio)' : 'Nombres y Apellidos (Opcional)'}
            </label>
            <input 
              type="text" 
              value={emitForm.nombre} 
              onChange={(e) => setEmitForm({...emitForm, nombre: e.target.value})} 
              placeholder={emitForm.tipo === 'FACTURA' ? "Ej: Mi Empresa S.A.C." : "Ej: Juan Pérez"} 
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--bg-color)', border: emitForm.tipo === 'FACTURA' ? '1px solid #f97316' : '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '1rem' }} 
            />
          </div>
        </div>

        {/* Footer del modal con Tailwind/CSS in-line minimalista */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => setShowEmitModal(false)} 
            style={{ padding: '14px 28px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
          >
            Cancelar
          </button>
          <button 
            disabled={(emitForm.tipo === 'FACTURA' && (emitForm.documento.length !== 11 || emitForm.nombre.trim() === '')) || (emitForm.tipo === 'BOLETA' && emitForm.documento.length > 0 && emitForm.documento.length !== 8)}
            onClick={handleGenerateComprobante} 
            style={{ 
              padding: '14px 28px', 
              background: '#f97316',
              color: 'white', 
              border: 'none', 
              borderRadius: '14px', 
              cursor: ((emitForm.tipo === 'FACTURA' && (emitForm.documento.length !== 11 || emitForm.nombre.trim() === '')) || (emitForm.tipo === 'BOLETA' && emitForm.documento.length > 0 && emitForm.documento.length !== 8)) ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '0.95rem',
              opacity: ((emitForm.tipo === 'FACTURA' && (emitForm.documento.length !== 11 || emitForm.nombre.trim() === '')) || (emitForm.tipo === 'BOLETA' && emitForm.documento.length > 0 && emitForm.documento.length !== 8)) ? 0.5 : 1,
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)'
            }}
          >
            Generar
          </button>
        </div>
      </div>
    </Modal>
  </>
  );
};

export default Ventas;
