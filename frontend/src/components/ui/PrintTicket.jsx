import React from 'react';

const PrintTicket = ({ venta }) => {
  if (!venta) return null;

  return (
    <div className="print-ticket">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2>GYMPRO FITNESS</h2>
        <p>Comprobante Electrónico</p>
        <p>Ticket Nº 000{venta?.id || '0'}</p>
        <p>
          {venta?.fechaVenta ? new Date(venta.fechaVenta).toLocaleString() : (venta?.fecha || '')}
        </p>
      </div>
      <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
      <table style={{ width: '100%', marginBottom: '10px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>CANT x PROD</th>
            <th style={{ textAlign: 'right' }}>SUBT</th>
          </tr>
        </thead>
        <tbody>
          {(venta?.detalles || venta?.cartCopy || []).map(c => {
             const nombre = c.producto?.nombre || 'Producto';
             const subtotal = c.subtotal || 0;
             const cantidad = c.cantidad || 0;
             return (
              <tr key={c.producto?.id || Math.random()}>
                <td style={{ textAlign: 'left' }}>{cantidad}x {nombre.substring(0, 15)}</td>
                <td style={{ textAlign: 'right' }}>S/ {subtotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        <span>TOTAL</span>
        <span>S/ {venta?.total?.toFixed(2) || '0.00'}</span>
      </div>
      <div style={{ fontSize: '11px', marginBottom: '15px' }}>
        <div>PAGO VÍA: {venta?.metodoPago || venta?.metodo || 'EFECTIVO'}</div>
      </div>
      <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px' }}>¡Gracias por tu compra!<br/>El deporte es salud.</p>
    </div>
  );
};

export default PrintTicket;
