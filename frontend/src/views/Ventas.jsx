import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Calendar,
  DollarSign,
  Printer
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';
import PrintTicket from '../components/ui/PrintTicket';

const Ventas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ventaToPrint, setVentaToPrint] = useState(null);

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

  const filteredVentas = ventas.filter(v => {
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
                  <td data-label="ID" style={{ fontWeight: '600', color: 'var(--text-muted)' }}>#{venta.id}</td>
                  <td data-label="FECHA">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      {new Date(venta.fechaVenta).toLocaleString()}
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
                    <button
                      onClick={() => handleImprimir(venta)}
                      title="Reimprimir Comprobante"
                      style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <Printer size={16} />
                    </button>
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
  </>
  );
};

export default Ventas;
