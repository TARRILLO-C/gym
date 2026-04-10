import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Package, 
  ShoppingCart, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';
import PrintTicket from '../components/ui/PrintTicket';

const Productos = () => {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' o 'inventario'
  const [productos, setProductos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  // Modales globalizados
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [productForm, setProductForm] = useState({
    nombre: '', precio: '', stock: '', categoria: 'OTRO', descripcion: '', imagenUrl: ''
  });

  const [checkoutForm, setCheckoutForm] = useState({
    socioId: '', 
    metodoPago: 'EFECTIVO', 
    tipoComprobante: 'BOLETA', 
    numeroTarjeta: '', 
    numeroOperacion: '', 
    montoRecibido: '',
    clienteNombre: '',
    clienteDocumento: ''
  });

  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [lastVentaData, setLastVentaData] = useState(null);

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const [socioSearch, setSocioSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodResp, socioResp] = await Promise.all([
        api.get('/productos'),
        api.get('/socios')
      ]);
      setProductos(prodResp.data);
      setSocios(socioResp.data);
    } catch (err) { } finally { setLoading(false); }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/productos/${editingProduct.id}`, productForm);
      } else {
        await api.post('/productos', productForm);
      }
      setShowProductModal(false);
      fetchData();
      resetProductForm();
    } catch (err) { showAlert("Error", "Error al guardar producto"); }
  };

  const resetProductForm = () => {
    setProductForm({ nombre: '', precio: '', stock: '', categoria: 'OTRO', descripcion: '', imagenUrl: '' });
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Eliminar Producto',
      message: '¿Estás seguro de eliminar este producto?',
      onConfirm: async () => {
        try {
          await api.delete(`/productos/${id}`);
          fetchData();
        } catch (err) { showAlert("Error", "Error al eliminar"); }
      }
    });
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.producto.id === product.id);
    if (existing) {
      if (existing.cantidad >= product.stock) { showAlert("Atención", "No hay más stock disponible"); return; }
      setCart(cart.map(item => item.producto.id === product.id ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * product.precio } : item));
    } else {
      setCart([...cart, { producto: product, cantidad: 1, subtotal: product.precio }]);
    }
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.producto.id === productId) {
        const newQty = item.cantidad + delta;
        if (newQty <= 0) return null;
        if (newQty > item.producto.stock) { showAlert("Atención", "Stock máximo alcanzado"); return item; }
        return { ...item, cantidad: newQty, subtotal: newQty * item.producto.precio };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const [isSearchingDoc, setIsSearchingDoc] = useState(false);

  const handleDocumentLookup = async () => {
    const isFactura = checkoutForm.tipoComprobante === 'FACTURA';
    const doc = checkoutForm.clienteDocumento || '';
    if (doc.length === 8 && !isFactura) {
      setIsSearchingDoc(true);
      try {
        const res = await api.get(`/consultas/dni/${doc}`);
        if (res.data && res.data.nombreCompleto) {
          setCheckoutForm(prev => ({...prev, clienteNombre: res.data.nombreCompleto}));
        }
      } catch (err) { console.error("Error dni:", err); }
      setIsSearchingDoc(false);
    } else if (doc.length === 11 && isFactura) {
      setIsSearchingDoc(true);
      try {
        const res = await api.get(`/consultas/ruc/${doc}`);
        if (res.data && res.data.nombreCompleto) {
          setCheckoutForm(prev => ({...prev, clienteNombre: res.data.nombreCompleto}));
        }
      } catch (err) { console.error("Error ruc:", err); }
      setIsSearchingDoc(false);
    }
  };

  const handleFinalizeSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (checkoutForm.metodoPago === 'TARJETA' && !checkoutForm.numeroTarjeta) {
      showAlert("Atención", "Debe ingresar un número de tarjeta válido o comprobante de POS.");
      return;
    }
    if (checkoutForm.metodoPago === 'TRANSFERENCIA' && !checkoutForm.numeroOperacion) {
      showAlert("Atención", "Debe ingresar el número de operación de la transferencia.");
      return;
    }

    try {
      const payload = {
        socioId: checkoutForm.socioId || null,
        metodoPago: checkoutForm.metodoPago,
        tipoComprobante: checkoutForm.tipoComprobante,
        clienteNombre: checkoutForm.clienteNombre,
        clienteDocumento: checkoutForm.clienteDocumento,
        referencia: checkoutForm.metodoPago === 'TARJETA' ? checkoutForm.numeroTarjeta : checkoutForm.numeroOperacion,
        detalles: cart.map(item => ({ producto: { id: item.producto.id }, cantidad: item.cantidad }))
      };
      
      const resp = await api.post('/ventas', payload);
      const ventaRealData = resp.data;
      
      setLastVentaData(ventaRealData);
      setCart([]);
      setCheckoutForm({...checkoutForm, numeroTarjeta: '', numeroOperacion: '', montoRecibido: '', socioId: '', clienteNombre: '', clienteDocumento: ''});
      setSocioSearch('');
      setShowCheckoutModal(false);
      
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: '¡Venta Registrada con Éxito!',
        message: ventaRealData.enlacePdfTicket ? 'El comprobante oficial ha sido generado por SUNAT.' : 'La transacción se procesó correctamente.',
        btnConfirmText: 'NUEVA VENTA',
        extraContent: ventaRealData.enlacePdfTicket ? (
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button onClick={() => window.open(ventaRealData.enlacePdfTicket, '_blank')} style={{ flex: 1, padding: '12px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🖨️ VER TICKET (80mm)</button>
            <button onClick={() => window.open(ventaRealData.enlacePdfA4, '_blank')} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--panel-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📄 VER PDF (A4)</button>
          </div>
        ) : (
          <div style={{ marginTop: '15px' }}>
            <button onClick={() => { setDialogConfig({isOpen: false}); setTimeout(() => window.print(), 350); }} style={{ width: '100%', padding: '12px', background: 'var(--accent-secondary)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>IMPRIMIR TICKET INTERNO</button>
          </div>
        )
      });
      fetchData();
    } catch (err) { showAlert("Error", "Error al procesar la venta"); }
  };

  const filteredProducts = productos.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || p.categoria.toLowerCase().includes(search.toLowerCase()));
  const filteredSocios = socios.filter(s => s.nombreCompleto.toLowerCase().includes(socioSearch.toLowerCase()) || s.dni.includes(socioSearch));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <PageLayout
      title={<span>Punto de <span className="text-gradient">Venta</span></span>}
      subtitle="Gestiona tu inventario y realiza ventas rápidas."
      actionButton={
        <div className="tab-switcher" style={{ display: 'flex', background: 'var(--panel-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
          <button onClick={() => setActiveTab('pos')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'pos' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'pos' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}>
            <ShoppingBag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Venta
          </button>
          <button onClick={() => setActiveTab('inventario')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'inventario' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'inventario' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}>
            <Package size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Inventario
          </button>
        </div>
      }
    >
      <div className="pos-container" style={{ display: 'flex', gap: '24px', flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--panel-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px', width: '100%', background: 'transparent' }} />
            </div>
            {activeTab === 'inventario' && (
              <button className="btn-primary" onClick={() => { resetProductForm(); setShowProductModal(true); }}>
                <Plus size={18} /> NUEVO PRODUCTO
              </button>
            )}
          </div>

          {activeTab === 'pos' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {filteredProducts.map(p => (
                <div key={p.id} className="card product-card" style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--panel-border)', transition: '0.3s' }} onClick={() => p.stock > 0 && addToCart(p)}>
                  <div style={{ height: '160px', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {p.imagenUrl ? <img src={p.imagenUrl} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={48} color="var(--text-muted)" />}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>{p.categoria}</div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>S/ {p.precio.toFixed(2)}</span>
                      <span style={{ fontSize: '0.8rem', color: p.stock < 5 ? '#ff3e3e' : '#00ff7f' }}>{p.stock} disp.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', textAlign: 'left' }}>
                    <th style={{ padding: '16px' }}>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th style={{ textAlign: 'right', padding: '16px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td data-label="PRODUCTO" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.descripcion || "Sin descripción"}</div>
                      </td>
                      <td data-label="CATEGORÍA"><span className="badge" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>{p.categoria}</span></td>
                      <td data-label="PRECIO" style={{ fontWeight: 'bold' }}>S/ {p.precio.toFixed(2)}</td>
                      <td data-label="STOCK">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.stock < 5 ? '#ff3e3e' : '#00ff7f' }}>
                          {p.stock < 5 && <AlertTriangle size={14} />}
                          {p.stock} unidades
                        </div>
                      </td>
                      <td data-label="ACCIONES" style={{ textAlign: 'right', padding: '16px' }}>
                        <button onClick={() => { setEditingProduct(p); setProductForm(p); setShowProductModal(true); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff3e3e', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeTab === 'pos' && (
          <div className="card cart-sidebar" style={{ width: '350px', background: 'var(--panel-bg)', display: 'flex', flexDirection: 'column', padding: '20px', border: '1px solid var(--panel-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '16px' }}>
              <ShoppingCart size={24} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.4rem' }}>Tu Carrito</h3>
              <span style={{ marginLeft: 'auto', background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>{cart.length}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.producto.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.producto.nombre}</div>
                      <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>S/ {item.subtotal.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-color)', padding: '4px', borderRadius: '8px' }}>
                      <button onClick={() => updateCartQuantity(item.producto.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                      <button onClick={() => updateCartQuantity(item.producto.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p>Agrega productos para comenzar la venta.</p>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '16px' }} disabled={cart.length === 0} onClick={() => setShowCheckoutModal(true)}>
                FINALIZAR VENTA
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nombre del Producto</label>
            <input required type="text" value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value})} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Precio (S/)</label>
            <input required type="number" step="0.01" value={productForm.precio} onChange={e => setProductForm({...productForm, precio: e.target.value})} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Stock Inicial</label>
            <input required type="number" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Categoría</label>
            <select value={productForm.categoria} onChange={e => setProductForm({...productForm, categoria: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <option value="BEBIDA">BEBIDA</option>
              <option value="SUPLEMENTO">SUPLEMENTO</option>
              <option value="ROPA">ROPA</option>
              <option value="ACCESORIO">ACCESORIO</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Imagen URL (Opcional)</label>
            <input type="text" value={productForm.imagenUrl} onChange={e => setProductForm({...productForm, imagenUrl: e.target.value})} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Descripción</label>
            <textarea value={productForm.descripcion} onChange={e => setProductForm({...productForm, descripcion: e.target.value})} style={{ width: '100%', height: '80px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '12px' }}></textarea>
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>GUARDAR PRODUCTO</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Finalizar Transacción">
        <form onSubmit={handleFinalizeSale} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asociar a un Socio (Opcional)</label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar por DNI o Nombre..." value={socioSearch} onChange={e => setSocioSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
              {socioSearch && filteredSocios.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1100, maxHeight: '150px', overflowY: 'auto' }}>
                  {filteredSocios.map(s => (
                    <div key={s.id} onClick={() => { 
                      setCheckoutForm({
                        ...checkoutForm, 
                        socioId: s.id, 
                        clienteNombre: checkoutForm.tipoComprobante === 'FACTURA' ? (s.razonSocial || s.nombreCompleto) : s.nombreCompleto,
                        clienteDocumento: checkoutForm.tipoComprobante === 'FACTURA' ? (s.ruc || s.dni) : s.dni
                      }); 
                      setSocioSearch(s.nombreCompleto); 
                    }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}>
                      {s.nombreCompleto} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({s.dni})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Método de Pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '16px' }}>
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE_PLIN'].map(metodo => (
                <div key={metodo} onClick={() => setCheckoutForm({...checkoutForm, metodoPago: metodo})} style={{ padding: '12px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', background: checkoutForm.metodoPago === metodo ? 'rgba(255, 62, 62, 0.1)' : 'var(--panel-bg)', border: checkoutForm.metodoPago === metodo ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)', color: checkoutForm.metodoPago === metodo ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                  {metodo.replace('_', ' / ')}
                </div>
              ))}
            </div>

            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tipo de Comprobante</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '24px' }}>
              {[
                { id: 'BOLETA', label: 'Boleta' }, 
                { id: 'FACTURA', label: 'Factura' }, 
                { id: 'NOTA_VENTA', label: 'Ticket Int.' }
              ].map(tipo => (
                <div 
                  key={tipo.id} 
                  onClick={() => {
                    const isFactura = tipo.id === 'FACTURA';
                    setCheckoutForm({
                      ...checkoutForm, 
                      tipoComprobante: tipo.id,
                      // Limpiar o mantener según socio
                      clienteDocumento: '',
                      clienteNombre: ''
                    });
                  }} 
                  style={{ 
                    padding: '12px 6px', 
                    borderRadius: '12px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    background: checkoutForm.tipoComprobante === tipo.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--panel-bg)', 
                    border: checkoutForm.tipoComprobante === tipo.id ? '1px solid #3b82f6' : '1px solid var(--panel-border)', 
                    color: checkoutForm.tipoComprobante === tipo.id ? '#3b82f6' : 'var(--text-main)' 
                  }}
                >
                  {tipo.label}
                </div>
              ))}
            </div>
            {/* Campos Dinámicos para Boleta/Factura */}
            {checkoutForm.tipoComprobante === 'FACTURA' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>RUC (Obligatorio para Factura)</label>
                  <div style={{ position: 'relative' }}>
                    <input required type="text" value={checkoutForm.clienteDocumento} onChange={e => setCheckoutForm({...checkoutForm, clienteDocumento: e.target.value.replace(/\D/g, '')})} onBlur={handleDocumentLookup} maxLength="11" placeholder="Ej: 20601234567" style={{ borderColor: '#3b82f6', width: '100%' }} />
                    {isSearchingDoc && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#3b82f6' }}>Buscando...</div>}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>Razón Social</label>
                  <input required type="text" value={checkoutForm.clienteNombre} onChange={e => setCheckoutForm({...checkoutForm, clienteNombre: e.target.value})} placeholder="Ej: Mi Empresa S.A.C." style={{ borderColor: '#3b82f6' }} />
                </div>
              </div>
            )}

            {checkoutForm.tipoComprobante === 'BOLETA' && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>DNI (Opcional para Boleta)</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={checkoutForm.clienteDocumento} onChange={e => setCheckoutForm({...checkoutForm, clienteDocumento: e.target.value.replace(/\D/g, '')})} onBlur={handleDocumentLookup} maxLength="8" placeholder="Ej: 71234567" style={{ borderColor: '#3b82f6', width: '100%' }} />
                  {isSearchingDoc && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#3b82f6' }}>Buscando...</div>}
                </div>
                <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold', marginTop: '8px', display: 'block' }}>Nombre Completo</label>
                <input type="text" value={checkoutForm.clienteNombre} onChange={e => setCheckoutForm({...checkoutForm, clienteNombre: e.target.value})} placeholder="Público General" style={{ borderColor: '#3b82f6' }} />
              </div>
            )}

            {/* Configuración Dinámica de Métodos de Pago */}
            {checkoutForm.metodoPago === 'EFECTIVO' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto Recibido S/ (Calculadora Opcional)</label>
                <input type="number" step="0.01" value={checkoutForm.montoRecibido} onChange={e => setCheckoutForm({...checkoutForm, montoRecibido: e.target.value})} placeholder={`Ej: ${cartTotal.toFixed(2)}`} />
                {checkoutForm.montoRecibido > cartTotal && (
                  <div style={{ color: '#00ff7f', fontSize: '0.85rem', marginTop: '6px', fontWeight: 'bold', padding: '6px', background: 'rgba(0, 255, 127, 0.1)', borderRadius: '6px' }}>
                    VUELTO A ENTREGAR: S/ {(checkoutForm.montoRecibido - cartTotal).toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            {checkoutForm.metodoPago === 'TARJETA' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nº de Tarjeta (Aprobación POS)</label>
                <input required type="text" value={checkoutForm.numeroTarjeta} onChange={e => setCheckoutForm({...checkoutForm, numeroTarjeta: e.target.value})} placeholder="Ej: **** **** **** 1234 o Cód. POS" />
              </div>
            )}
            
            {checkoutForm.metodoPago === 'TRANSFERENCIA' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nº de Operación Bancaria</label>
                <input required type="text" value={checkoutForm.numeroOperacion} onChange={e => setCheckoutForm({...checkoutForm, numeroOperacion: e.target.value})} placeholder="Ej: 00234141" />
              </div>
            )}
            
            {checkoutForm.metodoPago === 'YAPE_PLIN' && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Captura de Pantalla / Voucher (Opcional)</label>
                <input type="file" accept="image/*" style={{ border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', padding: '10px', borderRadius: '12px', color: 'var(--text-main)' }} />
                <input type="text" value={checkoutForm.numeroOperacion} onChange={e => setCheckoutForm({...checkoutForm, numeroOperacion: e.target.value})} placeholder="Nº Operación o Celular Referencia (Opcional)" />
              </div>
            )}

          </div>
          <div style={{ background: 'rgba(255, 62, 62, 0.05)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed rgba(255, 62, 62, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total a Pagar</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</div>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}>
            CONFIRMAR Y PAGAR
          </button>
        </form>
      </Modal>
    </PageLayout>

    {/* Global Action Modal para Prompts/Exitos */}
    <Modal isOpen={dialogConfig.isOpen} onClose={() => setDialogConfig({ isOpen: false })} title={dialogConfig.title || 'Aviso'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--text-main)', fontSize: '1rem', margin: 0 }}>{dialogConfig.message}</p>
        
        {dialogConfig.extraContent && dialogConfig.extraContent}

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          {dialogConfig.type !== 'alert' && (
            <button onClick={() => setDialogConfig({ isOpen: false })} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)' }}>
              {dialogConfig.btnCancelText || 'Cancelar'}
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={() => {
              dialogConfig.onConfirm && dialogConfig.onConfirm();
              if(dialogConfig.type !== 'confirm') setDialogConfig({ isOpen: false });
            }} 
            style={{ padding: '10px 24px' }}
          >
            {dialogConfig.btnConfirmText || (dialogConfig.type === 'alert' ? 'Aceptar' : 'Confirmar')}
          </button>
        </div>
      </div>
    </Modal>

    {/* Etiqueta Térmica Printable (Oculta x defecto) */}
    <PrintTicket venta={lastVentaData} />

    </div>
  );
};

export default Productos;
