import React, { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, TrendingUp, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Download, Search, X, User, Ban } from 'lucide-react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const formatMoney = (n) => 'S/ ' + parseFloat(n || 0).toFixed(2);
const today = () => new Date().toISOString().split('T')[0];

const CierreCaja = ({ onClose }) => {
  const [cierre, setCierre] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [montoApertura, setMontoApertura] = useState('0');
  const [obsApertura, setObsApertura] = useState('');
  const [montoCierre, setMontoCierre] = useState('');
  const [obsCierre, setObsCierre] = useState('');

  const username = sessionStorage.getItem('username') || 'admin';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [cResp, rResp] = await Promise.all([
        api.get('/cierre-caja/hoy'),
        api.get('/cierre-caja/resumen')
      ]);
      setCierre(cResp.data || null);
      setResumen(rResp.data);
    } catch (err) {
      setError('Error al cargar datos de caja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const abrirCaja = async () => {
    setActionLoading(true);
    setError('');
    try {
      const resp = await api.post('/cierre-caja/abrir', {
        username,
        montoInicial: montoApertura,
        observaciones: obsApertura
      });
      setCierre(resp.data);
      setMontoApertura('0');
      setObsApertura('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al abrir caja.');
    } finally {
      setActionLoading(false);
    }
  };

  const cerrarCaja = async () => {
    if (!montoCierre || parseFloat(montoCierre) < 0) {
      setError('Ingrese un monto real válido.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const resp = await api.post('/cierre-caja/cerrar', {
        cierreId: cierre.id,
        montoFinalReal: montoCierre,
        observaciones: obsCierre
      });
      setCierre(resp.data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cerrar caja.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalEsperado = resumen ? (parseFloat(resumen.total || 0) + parseFloat(cierre?.montoInicial || 0)).toFixed(2) : '0.00';

  const exportExcel = () => {
    const detalle = resumen?.detalle || {};
    const data = Object.entries(detalle).map(([metodo, monto]) => ({
      'Método de Pago': metodo,
      'Total': parseFloat(monto).toFixed(2)
    }));
    data.push({ 'Método de Pago': 'TOTAL', 'Total': (resumen?.total || 0).toFixed(2) });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
    XLSX.writeFile(wb, 'CierreCaja_' + today() + '.xlsx');
  };

  const exportPdf = () => {
    const detalle = resumen?.detalle || {};
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Cierre de Caja', 14, 20);
    doc.setFontSize(10);
    doc.text('Fecha: ' + new Date().toLocaleDateString('es-PE'), 14, 28);
    doc.text('Estado: ' + (cierre?.estado || 'SIN APERTURA'), 14, 34);
    autoTable(doc, {
      startY: 40,
      head: [['Método de Pago', 'Total']],
      body: [
        ...Object.entries(detalle).map(([m, t]) => [m, 'S/ ' + parseFloat(t).toFixed(2)]),
        ['TOTAL', 'S/ ' + (resumen?.total || 0).toFixed(2)]
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 62, 62] }
    });
    doc.save('CierreCaja_' + today() + '.pdf');
  };

  const estadoColor = (est) => {
    if (est === 'CERRADO') return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', icon: CheckCircle, label: 'Cerrada' };
    if (est === 'DIFERENCIA') return { bg: 'rgba(255,62,62,0.12)', color: '#ff3e3e', icon: AlertTriangle, label: 'Con Diferencia' };
    return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: TrendingUp, label: 'Abierta' };
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-color)',
        border: '1px solid var(--panel-border)',
        borderRadius: '20px',
        width: '100%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '28px'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
            <Ban size={24} color="var(--accent-primary)" /> Cierre de <span className="text-gradient">Caja</span>
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
            <X size={24} />
          </button>
        </div>

        <style>{`
          .cc-card { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px; padding: 24px; }
          .cc-stat { background: var(--panel-bg); border: 1px solid var(--panel-border); border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; flex: 1; min-width: 180px; }
          .cc-stat-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .btn-cc { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 12px; border: none; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: all 0.2s; }
          .btn-cc:hover { transform: translateY(-1px); }
          .btn-cc:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        `}</style>

        {error && (
          <div style={{ padding: '14px 20px', background: 'rgba(255,62,62,0.1)', border: '1px solid rgba(255,62,62,0.3)', borderRadius: '12px', color: '#ff3e3e', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button className="btn-cc" onClick={fetchData} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button className="btn-cc" onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Download size={16} /> Excel
          </button>
          <button className="btn-cc" onClick={exportPdf} style={{ background: 'rgba(255,62,62,0.12)', color: '#ff3e3e', border: '1px solid rgba(255,62,62,0.3)' }}>
            <FileText size={16} /> PDF
          </button>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div className="cc-stat">
            <div className="cc-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}><Calendar size={24} /></div>
            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Fecha</div><div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          </div>
          <div className="cc-stat">
            <div className="cc-stat-icon" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}><User size={24} /></div>
            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Usuario</div><div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{username}</div></div>
          </div>
          <div className="cc-stat">
            <div className="cc-stat-icon" style={cierre ? { background: estadoColor(cierre.estado).bg, color: estadoColor(cierre.estado).color } : { background: 'rgba(100,100,100,0.1)', color: 'var(--text-muted)' }}>
              {cierre ? React.createElement(estadoColor(cierre.estado).icon, { size: 24 }) : <XCircle size={24} />}
            </div>
            <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Estado</div><div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{cierre ? estadoColor(cierre.estado).label : 'Sin apertura'}</div></div>
          </div>
        </div>

        {!cierre && !loading && (
          <div className="cc-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={22} color="var(--accent-primary)" /> Abrir Caja</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Monto Inicial (S/)</label>
                <input type="number" step="0.01" min="0" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: '2 1 300px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Observaciones (opcional)</label>
                <input type="text" value={obsApertura} onChange={(e) => setObsApertura(e.target.value)} placeholder="Ej: Caja aperturada con fondo inicial" style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button className="btn-cc" onClick={abrirCaja} disabled={actionLoading || !montoApertura} style={{ background: 'var(--accent-primary)', color: '#fff', padding: '12px 32px' }}>
                {actionLoading ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </div>
        )}

        {resumen && (
          <div className="cc-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingUp size={22} color="var(--accent-secondary)" /> Resumen de Ingresos del Día</h3>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {cierre && <span>Monto Inicial: <strong style={{ color: 'var(--text-main)' }}>{formatMoney(cierre.montoInicial)}</strong></span>}
              </div>
            </div>

            {Object.keys(resumen.detalle || {}).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay ingresos registrados hoy.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Método de Pago</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resumen.detalle).map(([metodo, monto]) => (
                      <tr key={metodo}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 600 }}>{metodo}</td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatMoney(monto)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '1rem' }}>TOTAL INGRESOS</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>{formatMoney(resumen.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {cierre && cierre.estado === 'ABIERTO' && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)' }}>
                <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <DollarSign size={20} color="#22c55e" /> Cerrar Caja
                </h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Monto Esperado</label>
                    <div style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700, minWidth: '160px' }}>
                      {formatMoney(totalEsperado)}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Monto Real Contado (S/)</label>
                    <input type="number" step="0.01" min="0" value={montoCierre} onChange={(e) => setMontoCierre(e.target.value)} placeholder="0.00" style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700, outline: 'none', width: '180px' }} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Observaciones</label>
                    <input type="text" value={obsCierre} onChange={(e) => setObsCierre(e.target.value)} placeholder="Opcional" style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <button className="btn-cc" onClick={cerrarCaja} disabled={actionLoading || montoCierre === ''} style={{ background: '#22c55e', color: '#fff', padding: '12px 32px' }}>
                    {actionLoading ? 'Cerrando...' : 'Cerrar Caja'}
                  </button>
                </div>
                {montoCierre && parseFloat(montoCierre) >= 0 && (
                  <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}>
                    <AlertTriangle size={20} color="#f97316" />
                    <span>Diferencia estimada: <strong style={{ color: Math.abs(parseFloat(montoCierre) - parseFloat(totalEsperado)) > 0.5 ? '#ff3e3e' : '#22c55e' }}>
                      {formatMoney(parseFloat(montoCierre) - parseFloat(totalEsperado))}
                    </strong></span>
                  </div>
                )}
              </div>
            )}

            {cierre && cierre.estado !== 'ABIERTO' && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.95rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Monto Inicial:</span> <strong>{formatMoney(cierre.montoInicial)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Esperado:</span> <strong>{formatMoney(cierre.montoFinalEsperado)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Real:</span> <strong>{formatMoney(cierre.montoFinalReal)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Diferencia:</span> <strong style={{ color: parseFloat(cierre.diferencia || 0) > 0.5 ? '#ff3e3e' : '#22c55e' }}>{formatMoney(cierre.diferencia)}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Cerrado por:</span> <strong>{cierre.username}</strong></div>
                {cierre.observaciones && <div><span style={{ color: 'var(--text-muted)' }}>Obs:</span> <strong>{cierre.observaciones}</strong></div>}
              </div>
            )}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando datos de caja...</div>}

        <div style={{ textAlign: 'right', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CierreCaja;
