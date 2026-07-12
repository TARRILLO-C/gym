import React, { useState, useEffect, useCallback } from 'react';
import CierreCaja from './CierreCaja';
import {
  RefreshCw,
  Download,
  FileText,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  User,
  X,
  Ban,
  AlertTriangle,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const formatMoney = (n) => 'S/ ' + parseFloat(n || 0).toFixed(2);

const todayStr = () => new Date().toISOString().split('T')[0];

const MonitorCaja = () => {
  const [ventas, setVentas] = useState([]);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monitorSubTab, setMonitorSubTab] = useState('transacciones');
  const [historialCierres, setHistorialCierres] = useState([]);
  const [selectedCierre, setSelectedCierre] = useState(null);
  const [selectedCierreMovimientos, setSelectedCierreMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  // Nuevos filtros
  const [filterMetodoPago, setFilterMetodoPago] = useState('ALL');
  const [filterCajero, setFilterCajero] = useState('');
  const [filterSocio, setFilterSocio] = useState('');
  const [filterComprobante, setFilterComprobante] = useState('');

  const [cierreStartDate, setCierreStartDate] = useState('');
  const [cierreEndDate, setCierreEndDate] = useState('');
  const [cierreStatus, setCierreStatus] = useState('ALL');
  const [cierreUser, setCierreUser] = useState('');


  // Estado del modal de anulación
  const [anulacionModal, setAnulacionModal] = useState({ show: false, ventaId: null, cliente: '' });
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [pinAdmin, setPinAdmin] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vResp, pResp, prResp, cResp] = await Promise.all([
        api.get('/ventas/productos'),
        api.get('/pagos'),
        api.get('/productos'),
        api.get('/sesiones-caja/historial').catch(() => ({ data: [] }))
      ]);
      setVentas(Array.isArray(vResp.data) ? vResp.data : []);
      setPagos(Array.isArray(pResp.data) ? pResp.data : []);
      setProductos(Array.isArray(prResp.data) ? prResp.data : []);
      setHistorialCierres(Array.isArray(cResp.data) ? cResp.data : []);
    } catch (err) {
      console.error('Error fetching monitor data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (selectedCierre) {
      setLoadingMovimientos(true);
      api.get(`/sesiones-caja/${selectedCierre.id}/movimientos`)
        .then(res => {
          setSelectedCierreMovimientos(res.data || []);
        })
        .catch(err => {
          console.error('Error fetching movements', err);
          setSelectedCierreMovimientos([]);
        })
        .finally(() => {
          setLoadingMovimientos(false);
        });
    } else {
      setSelectedCierreMovimientos([]);
    }
  }, [selectedCierre]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const ingresoHoy = [...ventas, ...pagos]
    .filter(r => new Date(r.fecha || r.fechaPago) >= todayStart)
    .reduce((s, r) => s + parseFloat(r.total || r.monto || 0), 0);

  const ingresoMes = [...ventas, ...pagos]
    .filter(r => new Date(r.fecha || r.fechaPago) >= monthStart)
    .reduce((s, r) => s + parseFloat(r.total || r.monto || 0), 0);

  const totalVentas = [...ventas, ...pagos].reduce((s, r) => s + parseFloat(r.total || r.monto || 0), 0);
  const ingresosCatalogo = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);

  const allRecords = [
    ...ventas.map(v => ({
      id: v.id,
      fecha: v.fecha,
      tipo: 'Venta Producto',
      cliente: v.socio?.nombreCompleto || v.clienteNombre || 'General',
      metodo: v.metodoPago,
      monto: parseFloat(v.total || 0),
      estado: v.activo === false ? 'Anulada' : 'Válida',
      activo: v.activo !== false,
      cajero: v.usuario?.username || v.creadoPor || '',
      comprobante: v.comprobante || v.nroComprobante || ''
    })),
    ...pagos.map(p => ({
      id: 'P' + p.id,
      fecha: p.fechaPago,
      tipo: 'Plan / Suscripción',
      cliente: p.suscripcion?.socio?.nombreCompleto || 'Desconocido',
      metodo: p.metodoPago,
      monto: parseFloat(p.monto || 0),
      estado: (p.venta && p.venta.activo === false) ? 'Anulada' : 'Válida',
      activo: !(p.venta && p.venta.activo === false),
      cajero: p.usuario?.username || p.creadoPor || '',
      comprobante: p.comprobante || p.nroComprobante || ''
    }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const filtered = allRecords.filter(r => {
    const q = search.toLowerCase();
    const nombre = r.cliente?.toLowerCase() || '';
    const metodo = r.metodo?.toLowerCase() || '';
    const matchesSearch = !search || nombre.includes(q) || metodo.includes(q);

    const fecha = new Date(r.fecha);
    const from = startDate ? new Date(startDate + 'T00:00:00') : null;
    const to = endDate ? new Date(endDate + 'T23:59:59') : null;
    const matchesFecha = (!from || fecha >= from) && (!to || fecha <= to);

    const matchesType = filterType === 'ALL' || r.tipo === filterType;
    const matchesMetodo = filterMetodoPago === 'ALL' || r.metodo === filterMetodoPago;
    const matchesCajero = !filterCajero || (r.cajero && r.cajero.toLowerCase().includes(filterCajero.toLowerCase()));
    const matchesSocio = !filterSocio || nombre.includes(filterSocio.toLowerCase());
    const matchesComprobante = !filterComprobante || (r.comprobante && r.comprobante.toLowerCase().includes(filterComprobante.toLowerCase()));

    return matchesSearch && matchesFecha && matchesType && matchesMetodo && matchesCajero && matchesSocio && matchesComprobante;
  });

  const filteredCierres = historialCierres.filter(c => {
    if (cierreStatus !== 'ALL') {
      if (c.estado !== cierreStatus) return false;
    }
    if (cierreUser && !c.username?.toLowerCase().includes(cierreUser.toLowerCase())) return false;
    
    if (cierreStartDate) {
      const d = new Date(c.aperturaAt);
      const start = new Date(cierreStartDate + 'T00:00:00');
      if (d < start) return false;
    }
    if (cierreEndDate) {
      const d = new Date(c.aperturaAt);
      const end = new Date(cierreEndDate + 'T23:59:59');
      if (d > end) return false;
    }
    return true;
  });

  const totalFiltrado = filtered.reduce((s, r) => s + r.monto, 0);
  const validasCount = filtered.filter(r => r.activo).length;
  const anuladasCount = filtered.filter(r => !r.activo).length;

  const exportExcel = () => {
    const data = filtered.map(r => ({
      Fecha: new Date(r.fecha).toLocaleString('es-PE'),
      Concepto: r.tipo,
      Cliente: r.cliente,
      'Método Pago': r.metodo,
      Monto: r.monto,
      Estado: r.estado
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `MonitorCaja_${todayStr()}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Monitor de Caja', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [['Fecha', 'Concepto', 'Cliente', 'Método', 'Monto', 'Estado']],
      body: filtered.map(r => [
        new Date(r.fecha).toLocaleString('es-PE'),
        r.tipo,
        r.cliente,
        r.metodo,
        'S/ ' + r.monto.toFixed(2),
        r.estado
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 62, 62] }
    });
    doc.save(`MonitorCaja_${todayStr()}.pdf`);
  };

  const handleAnularComprobante = async () => {
    if (!motivoAnulacion.trim()) {
      showToast('El motivo de anulación es obligatorio.', 'error');
      return;
    }
    if (!pinAdmin.trim()) {
      showToast('El PIN de administrador es obligatorio.', 'error');
      return;
    }
    setAnulando(true);
    try {
      await api.post(`/ventas/${anulacionModal.ventaId}/anular`, {
        motivoAnulacion: motivoAnulacion.trim(),
        pinAdmin: pinAdmin.trim()
      });
      showToast('Comprobante anulado exitosamente.', 'success');
      setAnulacionModal({ show: false, ventaId: null, cliente: '' });
      setMotivoAnulacion('');
      setPinAdmin('');
      fetchData();
    } catch (err) {
      if (err.response?.status === 403) {
        showToast('PIN de administrador incorrecto o sin permisos.', 'error');
      } else {
        showToast(err.response?.data?.error || 'Error al anular el comprobante.', 'error');
      }
    } finally {
      setAnulando(false);
    }
  };

  const abrirModalAnulacion = (ventaId, cliente) => {
    setAnulacionModal({ show: true, ventaId, cliente });
    setMotivoAnulacion('');
    setPinAdmin('');
  };

  return (
    <PageLayout
      title={<span>Monitor de <span className="text-gradient">Caja</span></span>}
      subtitle="Resumen financiero, reportes y control de inventario."
    >
      <style>{`
        .mc-card { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px; padding: 20px; }
        .mc-stat { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; flex: 1; min-width: 180px; transition: all 0.3s; }
        .mc-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .mc-stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .mc-table th { padding: 14px 16px; text-align: left; color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--panel-border); position: sticky; top: 0; background: var(--panel-bg); z-index: 5; }
        .mc-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .mc-table tbody tr:hover { background: rgba(255,255,255,0.03); }
        .badge-ok { background: rgba(34,197,94,0.12); color: #22c55e; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-err { background: rgba(255,62,62,0.12); color: #ff3e3e; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-warn { background: rgba(249,115,22,0.12); color: #f97316; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
        .btn-export:hover { transform: translateY(-1px); }
        .rank-card { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px; overflow: hidden; }
        .rank-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .rank-item:last-child { border-bottom: none; }
        .rank-pos { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; }
        @media (max-width: 768px) {
          .mc-stat { min-width: 100%; }
          .mc-table { font-size: 0.8rem; }
          .mc-table th, .mc-table td { padding: 10px 8px; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button className="btn-export" onClick={fetchData} disabled={loading} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
        <button className="btn-export" onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
          <Download size={16} />
          Excel
        </button>
        <button className="btn-export" onClick={exportPdf} style={{ background: 'rgba(255,62,62,0.12)', color: '#ff3e3e', border: '1px solid rgba(255,62,62,0.3)' }}>
          <FileText size={16} />
          PDF
        </button>
        <button className="btn-export" onClick={() => setShowCierreModal(true)} style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
          <DollarSign size={16} />
          Cierre de Caja
        </button>
      </div>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div className="mc-stat">
          <div className="mc-stat-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><TrendingUp size={24} /></div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos Hoy</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatMoney(ingresoHoy)}</div></div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={24} /></div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos del Mes</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatMoney(ingresoMes)}</div></div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
            <span style={{ fontSize: '20px', fontWeight: '800' }}>S/</span>
          </div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ventas Totales</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatMoney(totalVentas)}</div></div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-icon" style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><ShoppingBag size={24} /></div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos del Catálogo</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatMoney(ingresosCatalogo)}</div></div>
        </div>
      </div>

      <div className="mc-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--panel-border)', marginBottom: '20px', paddingBottom: '12px' }}>
          <button 
            onClick={() => setMonitorSubTab('transacciones')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: monitorSubTab === 'transacciones' ? 'rgba(255, 62, 62, 0.1)' : 'transparent',
              color: monitorSubTab === 'transacciones' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: '0.3s'
            }}
          >
            Listado de Transacciones
          </button>
          <button 
            onClick={() => setMonitorSubTab('cierres')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: monitorSubTab === 'cierres' ? 'rgba(255, 62, 62, 0.1)' : 'transparent',
              color: monitorSubTab === 'cierres' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: '0.3s'
            }}
          >
            Historial de Cierres
          </button>
        </div>


        {monitorSubTab === 'cierres' ? (
          loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando cierres...</div>
          ) : (
            <>
              {/* FILTROS CIERRES */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FECHA DESDE</label>
                  <input type="date" value={cierreStartDate} onChange={e => setCierreStartDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                </div>
                <div style={{ flex: '1 1 120px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FECHA HASTA</label>
                  <input type="date" value={cierreEndDate} onChange={e => setCierreEndDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>ESTADO</label>
                  <select value={cierreStatus} onChange={e => setCierreStatus(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <option value="ALL">Todos</option>
                    <option value="ABIERTA">Abierta</option>
                    <option value="CUADRADA">Cuadrada</option>
                    <option value="DESCUADRE">Descuadre</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>USUARIO</label>
                  <input type="text" placeholder="Ej: admin" value={cierreUser} onChange={e => setCierreUser(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={() => {
                    setCierreStartDate(''); setCierreEndDate(''); setCierreStatus('ALL'); setCierreUser('');
                  }} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, height: '36px' }}>
                    <X size={14} /> Limpiar
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="mc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Monto Inicial</th>
                    <th>Monto Esperado (Efectivo)</th>
                    <th>Monto Real</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCierres.length > 0 ? (
                    [...filteredCierres].sort((a,b) => new Date(b.aperturaAt) - new Date(a.aperturaAt)).map((c) => {
                      const diff = parseFloat(c.diferencia || 0);
                      let diffColor = 'var(--text-main)';
                      if (diff > 0) diffColor = '#22c55e'; // Sobrante
                      if (diff < 0) diffColor = '#ff3e3e'; // Faltante

                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => setSelectedCierre(c)}
                          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          title="Haz clic para ver detalles del turno"
                        >
                          <td style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            {c.aperturaAt ? new Date(c.aperturaAt).toLocaleString('es-PE') : '-'}
                          </td>
                          <td>{c.username}</td>
                          <td>{formatMoney(c.montoInicial)}</td>
                          <td>{formatMoney(c.montoFinalEsperado)}</td>
                          <td>{c.montoFinalReal !== null ? formatMoney(c.montoFinalReal) : '-'}</td>
                          <td style={{ fontWeight: 'bold', color: diffColor }}>
                            {c.montoFinalReal !== null ? formatMoney(diff) : '-'}
                          </td>
                          <td>
                            <span className={c.estado === 'ABIERTO' || c.estado === 'ABIERTA' ? 'badge-ok' : 'badge-err'} style={{
                              background: c.estado === 'ABIERTO' || c.estado === 'ABIERTA' ? 'rgba(34,197,94,0.12)' : 'rgba(255,62,62,0.12)',
                              color: c.estado === 'ABIERTO' || c.estado === 'ABIERTA' ? '#22c55e' : '#ff3e3e',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '700'
                            }}>
                              {c.estado}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.observaciones}>
                            {c.observaciones || '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No hay cierres de caja registrados que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          )
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              
              {/* Controles de Fechas Rápidos */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '8px' }}>Atajos de Fecha:</span>
                <button onClick={() => { const d = todayStr(); setStartDate(d); setEndDate(d); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem' }}>Hoy</button>
                <button onClick={() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const from = new Date(d.setDate(diff)); setStartDate(from.toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem' }}>Esta Semana</button>
                <button onClick={() => { const d = new Date(); const from = new Date(d); from.setDate(d.getDate() - 30); setStartDate(from.toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem' }}>Últimos 30 Días</button>
                <button onClick={() => { setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem' }}>Este Año</button>
              </div>

              {/* Grid de Filtros Avanzados */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FECHA DESDE</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FECHA HASTA</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CONCEPTO</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="ALL">Todos los conceptos</option>
                    <option value="Venta Producto">Venta Producto</option>
                    <option value="Plan / Suscripción">Plan / Suscripción</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>MÉTODO DE PAGO</label>
                  <select value={filterMetodoPago} onChange={(e) => setFilterMetodoPago(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="ALL">Todos</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="YAPE">Yape</option>
                    <option value="PLIN">Plin</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>CAJERO</label>
                  <input type="text" placeholder="Ej: admin" value={filterCajero} onChange={(e) => setFilterCajero(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>DNI / SOCIO</label>
                  <input type="text" placeholder="Ej: 71234567" value={filterSocio} onChange={(e) => setFilterSocio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>COMPROBANTE</label>
                  <input type="text" placeholder="Nro." value={filterComprobante} onChange={(e) => setFilterComprobante(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }} />
                </div>
                
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>FILTRO RÁPIDO</label>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', bottom: '10px', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Buscar en resultados..." value={search} onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s_]/g, ''))} style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={() => {
                    setSearch(''); setStartDate(''); setEndDate(''); setFilterType('ALL'); setFilterMetodoPago('ALL'); setFilterCajero(''); setFilterSocio(''); setFilterComprobante('');
                  }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'rgba(255,62,62,0.1)', color: '#ff3e3e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, height: '32px' }}>
                    <X size={14} /> Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>



            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando reportes...</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Registros: <strong style={{ color: 'var(--text-main)' }}>{filtered.length}</strong></span>
                  <span>Válidas: <strong style={{ color: '#22c55e' }}>{validasCount}</strong></span>
                  <span>Anuladas: <strong style={{ color: '#ff3e3e' }}>{anuladasCount}</strong></span>
                  <span>Total filtrado: <strong style={{ color: 'var(--accent-primary)' }}>{formatMoney(totalFiltrado)}</strong></span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th>Cliente</th>
                        <th>Método Pago</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r.id + '-' + i} style={{ opacity: r.activo ? 1 : 0.55 }}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} color="var(--text-muted)" />
                              {new Date(r.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          </td>
                          <td><span style={{ fontWeight: 600 }}>{r.tipo}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <User size={14} color="var(--text-muted)" />
                              {r.cliente}
                            </div>
                          </td>
                          <td><span className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)' }}>{r.metodo}</span></td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatMoney(r.monto)}</td>
                          <td><span className={r.activo ? 'badge-ok' : 'badge-err'}>{r.estado}</span></td>
                          <td>
                            {r.activo && r.tipo === 'Venta Producto' ? (
                              <button
                                onClick={() => abrirModalAnulacion(r.id, r.cliente)}
                                title="Anular Comprobante"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '5px',
                                  padding: '5px 12px', borderRadius: '8px',
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  background: 'rgba(239,68,68,0.08)',
                                  color: '#ef4444', cursor: 'pointer',
                                  fontSize: '0.78rem', fontWeight: 700,
                                  whiteSpace: 'nowrap', transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                              >
                                <Ban size={13} /> Anular Comprobante
                              </button>
                            ) : r.activo ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                            ) : (
                              <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>✕ Anulada</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron registros.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showCierreModal && <CierreCaja isOpen={true} onClose={() => { setShowCierreModal(false); fetchData(); }} />}

      {/* Modal: Detalles de Sesión de Caja */}
      {selectedCierre && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '650px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
              <div style={{ background: 'rgba(249,115,22,0.1)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
                <Clock size={28} color="#f97316" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700' }}>Detalles del Turno</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Usuario: <strong>{selectedCierre.username}</strong> | Turno: <strong>{selectedCierre.turno}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedCierre(null)}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Grid principal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Resumen Financiero */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Resumen General</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estado:</span>
                    <span className={selectedCierre.estado === 'ABIERTO' || selectedCierre.estado === 'ABIERTA' ? 'badge-ok' : 'badge-err'} style={{
                      background: selectedCierre.estado === 'ABIERTO' || selectedCierre.estado === 'ABIERTA' ? 'rgba(34,197,94,0.12)' : 'rgba(255,62,62,0.12)',
                      color: selectedCierre.estado === 'ABIERTO' || selectedCierre.estado === 'ABIERTA' ? '#22c55e' : '#ff3e3e',
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700'
                    }}>
                      {selectedCierre.estado}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Monto Inicial:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{formatMoney(selectedCierre.montoInicial)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Efectivo Esperado:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedCierre.montoFinalEsperado !== null ? formatMoney(selectedCierre.montoFinalEsperado) : '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Efectivo Real:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedCierre.montoFinalReal !== null ? formatMoney(selectedCierre.montoFinalReal) : '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--panel-border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Diferencia:</span>
                    <strong style={{ 
                      color: parseFloat(selectedCierre.diferencia || 0) < 0 ? '#ff3e3e' : parseFloat(selectedCierre.diferencia || 0) > 0 ? '#22c55e' : 'var(--text-main)',
                      fontWeight: 'bold'
                    }}>
                      {selectedCierre.montoFinalReal !== null ? formatMoney(selectedCierre.diferencia) : '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiempos y Siguiente Turno */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Detalles de Tiempos</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Apertura:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{new Date(selectedCierre.aperturaAt).toLocaleString('es-PE')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Cierre:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedCierre.cierreAt ? new Date(selectedCierre.cierreAt).toLocaleString('es-PE') : 'Aún abierto'}</strong>
                    </div>
                  </div>
                </div>
                {selectedCierre.cierreAt && (
                  <div style={{ borderTop: '1px dashed var(--panel-border)', paddingTop: '8px', marginTop: '10px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fondo Siguiente:</span>
                    <strong style={{ color: '#f97316' }}>{formatMoney(selectedCierre.fondoParaSiguiente)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Detalle de Ingresos por Métodos de Pago */}
            {(() => {
              let resumen = null;
              try {
                if (selectedCierre.resumenJson) {
                  resumen = JSON.parse(selectedCierre.resumenJson);
                }
              } catch(e) {}

              if (!resumen) return null;

              return (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Desglose de Ingresos</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {Object.entries(resumen.detalle || {}).map(([metodo, valor]) => (
                      <div key={metodo} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>
                          {metodo.replace('_', ' ')}
                        </span>
                        <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{formatMoney(valor)}</strong>
                      </div>
                    ))}
                    <div style={{ background: 'rgba(34,197,94,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                      <span style={{ color: '#22c55e', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Total Ingresos</span>
                      <strong style={{ color: '#22c55e', fontSize: '1.05rem' }}>{formatMoney(resumen.totalIngresos)}</strong>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Gastos/Egresos</span>
                      <strong style={{ color: '#ef4444', fontSize: '1.05rem' }}>{formatMoney(resumen.totalMovimientos)}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Listado de movimientos de caja (egresos / retiros) en el turno */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Movimientos Registrados (Gastos / Retiros)</h3>
              {loadingMovimientos ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando movimientos...</div>
              ) : selectedCierreMovimientos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedCierreMovimientos.map(m => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: m.tipo === 'EGRESO' ? '#f97316' : '#3b82f6', marginRight: '8px' }}>
                          {m.tipo}
                        </span>
                        <span style={{ color: 'var(--text-main)' }}>{m.descripcion}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#ef4444' }}>-{formatMoney(m.monto)}</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>By: {m.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  No se registraron egresos ni retiros de efectivo durante este turno.
                </div>
              )}
            </div>

            {/* Observaciones */}
            {selectedCierre.observaciones && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '700' }}>Observaciones del Cierre</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{selectedCierre.observaciones}</p>
              </div>
            )}

            {/* Botón Cerrar */}
            <button
              onClick={() => setSelectedCierre(null)}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#f97316', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Cerrar Detalles
            </button>
          </div>
        </div>
      )}

      {/* Modal: Anular Comprobante */}
      {anulacionModal.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
                <Ban size={28} color="#ef4444" />
              </div>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem' }}>Anular Comprobante</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Venta de: {anulacionModal.cliente}</p>
              </div>
              <button onClick={() => setAnulacionModal({ show: false, ventaId: null, cliente: '' })}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Aviso */}
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ color: '#ef4444', fontSize: '0.88rem', lineHeight: '1.5' }}>
                Esta acción es <strong>irreversible</strong>. El monto será devuelto al saldo de la caja actual y se registrará en la bitácora de auditoría.
              </span>
            </div>

            {/* Motivo */}
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>Motivo de Anulación *</label>
            <textarea
              rows={3}
              placeholder="Ej: Error en el precio, devolución del cliente..."
              value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'none', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }}
            />

            {/* PIN Admin */}
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={15} /> PIN de Administrador *</span>
            </label>
            <input
              type="password"
              placeholder="••••••"
              value={pinAdmin}
              onChange={e => setPinAdmin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnularComprobante()}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.06)', color: 'var(--text-main)', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '24px', outline: 'none', letterSpacing: '4px' }}
            />

            {/* Botones */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setAnulacionModal({ show: false, ventaId: null, cliente: '' })}
                disabled={anulando}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAnularComprobante}
                disabled={anulando}
                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: 'none', background: anulando ? '#666' : '#ef4444', color: 'white', fontWeight: 700, cursor: anulando ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
              >
                <Ban size={16} /> {anulando ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <div style={{
        position: 'fixed', bottom: '28px', right: '28px',
        background: toast.type === 'success' ? '#10b981' : '#ef4444',
        color: 'white', padding: '14px 22px', borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)', fontWeight: 700, zIndex: 9999,
        transform: toast.show ? 'translateY(0)' : 'translateY(120px)',
        opacity: toast.show ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.68,-0.55,0.265,1.55)',
        display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '360px'
      }}>
        {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
      </div>
    </PageLayout>
  );
};

export default MonitorCaja;