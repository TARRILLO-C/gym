import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  FileText,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  User,
  X
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
  const [pagos, setPagos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vResp, pResp, prResp] = await Promise.all([
        api.get('/ventas/productos'),
        api.get('/pagos'),
        api.get('/productos')
      ]);
      setVentas(Array.isArray(vResp.data) ? vResp.data : []);
      setPagos(Array.isArray(pResp.data) ? pResp.data : []);
      setProductos(Array.isArray(prResp.data) ? prResp.data : []);
    } catch (err) {
      console.error('Error fetching monitor data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const ingresoHoy = [...ventas, ...pagos]
    .filter(r => new Date(r.fecha || r.fechaPago) >= todayStart)
    .reduce((s, r) => s + parseFloat(r.total || r.monto || 0), 0);

  const ingresoMes = [...ventas, ...pagos]
    .filter(r => new Date(r.fecha || r.fechaPago) >= monthStart)
    .reduce((s, r) => s + parseFloat(r.total || r.monto || 0), 0);

  const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0);
  const stockBajo = productos.filter(p => p.stock <= p.stockMinimo && p.activo !== false).length;

  const allRecords = [
    ...ventas.map(v => ({
      id: v.id,
      fecha: v.fecha,
      tipo: 'Venta Producto',
      cliente: v.socio?.nombreCompleto || v.clienteNombre || 'General',
      metodo: v.metodoPago,
      monto: parseFloat(v.total || 0),
      estado: v.activo === false ? 'Anulada' : 'Válida',
      activo: v.activo !== false
    })),
    ...pagos.map(p => ({
      id: 'P' + p.id,
      fecha: p.fechaPago,
      tipo: 'Plan / Suscripción',
      cliente: p.suscripcion?.socio?.nombreCompleto || 'Desconocido',
      metodo: p.metodoPago,
      monto: parseFloat(p.monto || 0),
      estado: (p.venta && p.venta.activo === false) ? 'Anulada' : 'Válida',
      activo: !(p.venta && p.venta.activo === false)
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

    return matchesSearch && matchesFecha && matchesType;
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

  const lowStockProducts = productos
    .filter(p => p.stock <= p.stockMinimo && p.activo !== false)
    .sort((a, b) => (a.stock / a.stockMinimo) - (b.stock / b.stockMinimo));

  const [venciendo, setVenciendo] = useState([]);
  const [vencidos, setVencidos] = useState([]);

  useEffect(() => {
    api.get('/productos/por-vencer').then(r => setVenciendo(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/productos/vencidos').then(r => setVencidos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

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
          <div className="mc-stat-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}><DollarSign size={24} /></div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ventas Totales</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatMoney(totalVentas)}</div></div>
        </div>
        <div className="mc-stat">
          <div className="mc-stat-icon" style={{ background: stockBajo > 0 ? 'rgba(255,62,62,0.12)' : 'rgba(34,197,94,0.12)', color: stockBajo > 0 ? '#ff3e3e' : '#22c55e' }}><Package size={24} /></div>
          <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Bajo</div><div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stockBajo}</div></div>
        </div>
      </div>

      <div className="mc-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Buscar por cliente o método de pago..." value={search} onChange={(e) => setSearch(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s_]/g, ''))} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
              <button onClick={() => setFilterType('ALL')} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: filterType === 'ALL' ? 'var(--panel-border)' : 'transparent', color: filterType === 'ALL' ? 'var(--text-main)' : 'var(--text-muted)', transition: 'all .2s' }}>Todos</button>
              <button onClick={() => setFilterType('Venta Producto')} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: filterType === 'Venta Producto' ? 'rgba(59,130,246,0.2)' : 'transparent', color: filterType === 'Venta Producto' ? '#3b82f6' : 'var(--text-muted)', transition: 'all .2s' }}>Venta Producto</button>
              <button onClick={() => setFilterType('Plan / Suscripción')} style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: filterType === 'Plan / Suscripción' ? 'rgba(249,115,22,0.2)' : 'transparent', color: filterType === 'Plan / Suscripción' ? '#f97316' : 'var(--text-muted)', transition: 'all .2s' }}>Plan / Suscripción</button>
            </div>
            <button onClick={() => { const d = todayStr(); setStartDate(d); setEndDate(d); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Hoy</button>
            <button onClick={() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const from = new Date(d.setDate(diff)); setStartDate(from.toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Semana</button>
            <button onClick={() => { const d = new Date(); const from = new Date(d); from.setDate(d.getDate() - 30); setStartDate(from.toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>30 Días</button>
            <button onClick={() => { setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setEndDate(todayStr()); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Año</button>
            <div style={{ width: '1px', height: '28px', background: 'var(--panel-border)', margin: '0 4px' }} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
            {(search || startDate || endDate) && (
              <button onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,62,62,0.1)', color: '#ff3e3e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center' }} title="Limpiar filtros">
                <X size={16} />
              </button>
            )}
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id + '-' + i} style={{ opacity: r.activo ? 1 : 0.5 }}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="rank-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={20} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Productos con Stock Bajo</h3>
          </div>
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Todos los productos tienen stock suficiente.</div>
          ) : (
            lowStockProducts.slice(0, 10).map((p, i) => {
              const ratio = p.stock / p.stockMinimo;
              return (
                <div className="rank-item" key={p.id}>
                  <div className="rank-pos" style={{ background: ratio <= 0.3 ? 'rgba(255,62,62,0.15)' : ratio <= 0.7 ? 'rgba(249,115,22,0.15)' : 'rgba(34,197,94,0.15)', color: ratio <= 0.3 ? '#ff3e3e' : ratio <= 0.7 ? '#f97316' : '#22c55e' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.nombre}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock: {p.stock} / Mín: {p.stockMinimo}</div></div>
                  <span className={ratio <= 0.3 ? 'badge-err' : ratio <= 0.7 ? 'badge-warn' : 'badge-ok'} style={{ whiteSpace: 'nowrap' }}>{p.stock} uds</span>
                </div>
              );
            })
          )}
        </div>

        <div className="rank-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#f97316" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Productos Próximos a Vencer</h3>
          </div>
          {venciendo.length === 0 && vencidos.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay productos con fecha de vencimiento registrada.</div>
          ) : (
            <>
              {vencidos.slice(0, 5).map((p, i) => (
                <div className="rank-item" key={'v-' + p.id}>
                  <div className="rank-pos" style={{ background: 'rgba(255,62,62,0.15)', color: '#ff3e3e' }}>!</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.nombre}</div><div style={{ fontSize: '0.8rem', color: '#ff3e3e' }}>Vencido: {new Date(p.fechaVencimiento).toLocaleDateString('es-PE')}</div></div>
                  <span className="badge-err">VENCIDO</span>
                </div>
              ))}
              {venciendo.slice(0, 10 - vencidos.slice(0, 5).length).map((p, i) => {
                const dias = Math.ceil((new Date(p.fechaVencimiento) - now) / (1000 * 60 * 60 * 24));
                return (
                  <div className="rank-item" key={'p-' + p.id}>
                    <div className="rank-pos" style={{ background: dias <= 7 ? 'rgba(255,62,62,0.15)' : dias <= 15 ? 'rgba(249,115,22,0.15)' : 'rgba(59,130,246,0.15)', color: dias <= 7 ? '#ff3e3e' : dias <= 15 ? '#f97316' : '#3b82f6' }}>{i + 1}</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.nombre}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vence: {new Date(p.fechaVencimiento).toLocaleDateString('es-PE')} ({dias} días)</div></div>
                    <span className={dias <= 7 ? 'badge-err' : dias <= 15 ? 'badge-warn' : 'badge-ok'}>{dias} días</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default MonitorCaja;