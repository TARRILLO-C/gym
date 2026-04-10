import React from 'react';

const PrintTicket = ({ venta }) => {
  if (!venta) return null;

  return (
    <div className="print-ticket">
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ marginBottom: '4px' }}>THE JUNGLE</h2>
        <p style={{ fontSize: '11px', margin: '2px 0' }}>RUC: 20601234567</p>
        <p style={{ fontSize: '10px', margin: '2px 0' }}>Av. Universitaria 1234, Lima</p>
        <div style={{ margin: '10px 0', border: '1px solid #000', padding: '4px' }}>
          <div style={{ fontWeight: 'bold' }}>{venta?.tipoComprobante || 'TICKET DE VENTA'}</div>
          <div style={{ fontSize: '14px' }}>{venta?.serie && venta?.correlativo ? `${venta.serie} - ${venta.correlativo}` : `Nº 000${venta?.id}`}</div>
        </div>
        <p style={{ fontSize: '11px' }}>
          FECHA: {venta?.fecha ? new Date(venta.fecha).toLocaleString() : new Date().toLocaleString()}
        </p>
      </div>
      <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
      <table style={{ width: '100%', marginBottom: '10px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>CANT x PROD</th>
            <th style={{ textAlign: 'right' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {(venta?.detalles || []).map(c => {
             const nombre = c.producto?.nombre || 'Producto';
             const subtotal = c.subtotal || 0;
             const cantidad = c.cantidad || 0;
             return (
              <tr key={c.id || Math.random()}>
                <td style={{ textAlign: 'left' }}>{cantidad}x {nombre.substring(0, 18)}</td>
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
      <div style={{ fontSize: '10px', marginBottom: '15px' }}>
        <div>MODO PAGO: {venta?.metodoPago || 'EFECTIVO'}</div>
        {(venta?.socio || venta?.clienteNombre || venta?.clienteDocumento) && (
          <div style={{ marginTop: '4px' }}>
            CLIENTE: {venta.clienteNombre || venta?.socio?.razonSocial || venta?.socio?.nombreCompleto || 'PÚBLICO GENERAL'}<br/>
            DNI/RUC: {venta.clienteDocumento || venta?.socio?.ruc || venta?.socio?.dni || '00000000'}
          </div>
        )}
      </div>
      
      {venta?.codigoHash && (
        <div style={{ textAlign: 'center', fontSize: '9px', marginBottom: '15px' }}>
          <div style={{ border: '1px solid #000', width: '80px', height: '80px', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            [ Código QR ]
          </div>
          <div style={{ wordBreak: 'break-all' }}>Resumen: {venta.codigoHash}</div>
          <div style={{ marginTop: '4px' }}>Representación impresa de la {venta.tipoComprobante?.toLowerCase()} electrónica.</div>
        </div>
      )}

      <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
      <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '10px' }}>¡Gracias por tu preferencia!<br/>Conserva tu ticket para cualquier reclamo.</p>
    </div>
  );
};

export default PrintTicket;
