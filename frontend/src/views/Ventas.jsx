import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Calendar,
  DollarSign,
  Printer,
  Trash2,
  RotateCcw
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

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/ventas');
      // Asegurarse de que sea un arreglo.
      setVentas(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error("Error al cargar /ventas:", err);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  const handleImprimir = (venta) => {
    setVentaToPrint(venta);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleAnularVenta = (venta) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Anular Venta',
      message: `¿Estás seguro que deseas anular la venta #${venta.id}? El stock será devuelto (si aplica).`,
      onConfirm: async () => {
        try {
          await api.put(`/ventas/${venta.id}`, { ...venta, activo: false });
          await fetchVentas();
        } catch (err) { showAlert("Error", "Error al anular venta"); }
      }
    });
  };

  const handleRestoreVenta = (venta) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Reactivar Venta',
      message: `¿Estás seguro que deseas restaurar la venta #${venta.id}?`,
      onConfirm: async () => {
        try {
          await api.put(`/ventas/${venta.id}`, { ...venta, activo: true });
          await fetchVentas();
        } catch (err) { showAlert("Error", "Error al reactivar venta"); }
      }
    });
  };

  const filteredVentas = ventas
    .filter(v => {
      if (filterMode === 'ACTIVO') return v.activo !== false;
      if (filterMode === 'INACTIVO') return v.activo === false;
      return true;
    })
    .filter(v => {
      const term = search.toLowerCase();
      const socioNombre = v.socio?.nombreCompleto?.toLowerCase() || '';
      const metodo = v.metodoPago?.toLowerCase() || '';
      return socioNombre.includes(term) || metodo.includes(term);
    });

  return (<>
    <PageLayout
      title={<span>Historial de <span className="text-gradient">Ventas</span></span>}
      subtitle="Revisa todas las transacciones realizadas en la tiendita."
    >
      <div className="card" style={{ padding: '0 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Buscar por socio o método de pago..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => setFilterMode('ALL')}
              style={{ padding: '8px 16px', background: filterMode === 'ALL' ? 'var(--panel-border)' : 'transparent', color: 'var(--text-main)', borderRadius: '8px' }}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterMode('ACTIVO')}
              style={{ padding: '8px 16px', background: filterMode === 'ACTIVO' ? 'rgba(0, 255, 127, 0.2)' : 'transparent', color: filterMode === 'ACTIVO' ? '#00ff7f' : 'var(--text-main)', borderRadius: '8px' }}
            >
              Válidas
            </button>
            <button 
              onClick={() => setFilterMode('INACTIVO')}
              style={{ padding: '8px 16px', background: filterMode === 'INACTIVO' ? 'rgba(255, 62, 62, 0.2)' : 'transparent', color: filterMode === 'INACTIVO' ? '#ff3e3e' : 'var(--text-main)', borderRadius: '8px' }}
            >
              Anuladas
            </button>
          </div>
        </div>

        {loading ? (
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
                <tr key={venta.id}>
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
                  <td data-label="CLIENTE" style={{ fontWeight: '600' }}>
                    {venta.socio?.nombreCompleto || 'Cliente General'}
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
                                title="Ver Ticket de SUNAT (80mm)"
                                style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}
                              >
                                <Printer size={14} /> SUNAT
                              </button>
                              <button
                                onClick={() => window.open(venta.enlacePdfA4, '_blank')}
                                title="Ver PDF (A4)"
                                style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem' }}
                              >
                                <FileText size={14} /> A4
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleImprimir(venta)}
                              title="Reimprimir Comprobante Interno"
                              style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem' }}
                            >
                              <Printer size={16} /> INTERNO
                            </button>
                          )}
                          <button 
                            onClick={() => handleAnularVenta(venta)}
                            title="Anular Venta"
                            style={{ background: 'transparent', color: '#ff3e3e', border: 'none', cursor: 'pointer', padding: '8px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleRestoreVenta(venta)}
                          title="Restaurar Venta"
                          style={{ background: 'transparent', color: '#00ff7f', border: 'none', cursor: 'pointer', padding: '8px' }}
                        >
                          <RotateCcw size={16} />
                        </button>
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
        )}
      </div>
    </PageLayout>
    <PrintTicket venta={ventaToPrint} />
    
    <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{dialogConfig.message}</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          {dialogConfig.type !== 'alert' && (
            <button onClick={() => setDialogConfig({ isOpen: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={() => {
              if(dialogConfig.type === 'confirm') dialogConfig.onConfirm();
              setDialogConfig({ isOpen: false });
            }} 
            style={{ padding: '10px 24px' }}
          >
            {dialogConfig.type === 'alert' ? 'Aceptar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  </>
  );
};

export default Ventas;
