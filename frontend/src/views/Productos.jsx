import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Package, 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  CheckCircle,
  X,
  CreditCard,
  User,
  ShoppingBag,
  Info
} from 'lucide-react';

const Productos = () => {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' o 'inventario'
  const [productos, setProductos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  
  // Modales
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Forms
  const [productForm, setProductForm] = useState({
    nombre: '',
    precio: '',
    stock: '',
    categoria: 'OTRO',
    descripcion: '',
    imagenUrl: ''
  });

  const [checkoutForm, setCheckoutForm] = useState({
    socioId: '',
    metodoPago: 'EFECTIVO'
  });

  const [socioSearch, setSocioSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodResp, socioResp] = await Promise.all([
        api.get('/productos'),
        api.get('/socios')
      ]);
      setProductos(prodResp.data);
      setSocios(socioResp.data);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      alert("Error al guardar producto");
    }
  };

  const resetProductForm = () => {
    setProductForm({ nombre: '', precio: '', stock: '', categoria: 'OTRO', descripcion: '', imagenUrl: '' });
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este producto?")) {
      try {
        await api.delete(`/productos/${id}`);
        fetchData();
      } catch (err) {
        alert("Error al eliminar");
      }
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.producto.id === product.id);
    if (existing) {
      if (existing.cantidad >= product.stock) {
        alert("No hay más stock disponible");
        return;
      }
      setCart(cart.map(item => 
        item.producto.id === product.id 
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * product.precio }
          : item
      ));
    } else {
      setCart([...cart, { producto: product, cantidad: 1, subtotal: product.precio }]);
    }
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.producto.id === productId) {
        const newQty = item.cantidad + delta;
        if (newQty <= 0) return null;
        if (newQty > item.producto.stock) {
          alert("Stock máximo alcanzado");
          return item;
        }
        return { ...item, cantidad: newQty, subtotal: newQty * item.producto.precio };
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleFinalizeSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    try {
      const payload = {
        socioId: checkoutForm.socioId || null,
        metodoPago: checkoutForm.metodoPago,
        detalles: cart.map(item => ({
          producto: { id: item.producto.id },
          cantidad: item.cantidad
        }))
      };

      await api.post('/ventas', payload);
      alert("¡Venta registrada con éxito!");
      setCart([]);
      setShowCheckoutModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error al procesar la venta");
    }
  };

  const filteredProducts = productos.filter(p => 
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSocios = socios.filter(s => 
    s.nombreCompleto.toLowerCase().includes(socioSearch.toLowerCase()) || 
    s.dni.includes(socioSearch)
  );

  if (loading) return <div className="loading">Cargando productos...</div>;

  return (
    <div className="productos-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Punto de <span className="text-gradient">Venta</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona tu inventario y realiza ventas rápidas.</p>
        </div>

        <div className="tab-switcher" style={{ display: 'flex', background: 'var(--panel-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setActiveTab('pos')}
            className={activeTab === 'pos' ? 'active' : ''}
            style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'pos' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'pos' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}
          >
            <ShoppingBag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Venta
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={activeTab === 'inventario' ? 'active' : ''}
            style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'inventario' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'inventario' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}
          >
            <Package size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Inventario
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--panel-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o categoría..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '40px', width: '100%', background: 'rgba(255,255,255,0.03)' }}
              />
            </div>
            {activeTab === 'inventario' && (
              <button className="btn-primary" onClick={() => { resetProductForm(); setShowProductModal(true); }}>
                <Plus size={18} /> NUEVO PRODUCTO
              </button>
            )}
          </div>

          {activeTab === 'pos' ? (
            /* POS Grid View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {filteredProducts.map(p => (
                <div key={p.id} className="card product-card" style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--panel-border)', transition: '0.3s' }} onClick={() => p.stock > 0 && addToCart(p)}>
                  <div style={{ height: '160px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={48} color="rgba(255,255,255,0.1)" />
                    )}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: 'white' }}>
                      {p.categoria}
                    </div>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>S/ {p.precio.toFixed(2)}</span>
                      <span style={{ fontSize: '0.8rem', color: p.stock < 5 ? '#ff3e3e' : '#00ff7f' }}>
                        {p.stock} disp.
                      </span>
                    </div>
                  </div>
                  {p.stock === 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                      <span style={{ color: '#ff3e3e', fontWeight: 'bold' }}>SIN STOCK</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Inventory Table View */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
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
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.descripcion || "Sin descripción"}</div>
                      </td>
                      <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>{p.categoria}</span></td>
                      <td style={{ fontWeight: 'bold' }}>S/ {p.precio.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.stock < 5 ? '#ff3e3e' : '#00ff7f' }}>
                          {p.stock < 5 && <AlertTriangle size={14} />}
                          {p.stock} unidades
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '16px' }}>
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

        {/* Sidebar: Shopping Cart (Only in POS mode) */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '8px' }}>
                      <button onClick={() => updateCartQuantity(item.producto.id, -1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                      <button onClick={() => updateCartQuantity(item.producto.id, 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                  <p>Agrega productos para comenzar la venta.</p>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '16px' }}
                disabled={cart.length === 0}
                onClick={() => setShowCheckoutModal(true)}
              >
                FINALIZAR VENTA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Crear/Editar Producto */}
      {showProductModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '600px', background: '#121215' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem' }}>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Nombre del Producto</label>
                <input required type="text" value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value})} />
              </div>
              <div>
                <label>Precio (S/)</label>
                <input required type="number" step="0.01" value={productForm.precio} onChange={e => setProductForm({...productForm, precio: e.target.value})} />
              </div>
              <div>
                <label>Stock Inicial</label>
                <input required type="number" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
              </div>
              <div>
                <label>Categoría</label>
                <select value={productForm.categoria} onChange={e => setProductForm({...productForm, categoria: e.target.value})} style={{ width: '100%', padding: '12px', background: '#1a1a1e', color: 'white', borderRadius: '12px' }}>
                  <option value="BEBIDA">BEBIDA</option>
                  <option value="SUPLEMENTO">SUPLEMENTO</option>
                  <option value="ROPA">ROPA</option>
                  <option value="ACCESORIO">ACCESORIO</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              <div>
                <label>Imagen URL (Opcional)</label>
                <input type="text" value={productForm.imagenUrl} onChange={e => setProductForm({...productForm, imagenUrl: e.target.value})} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Descripción</label>
                <textarea value={productForm.descripcion} onChange={e => setProductForm({...productForm, descripcion: e.target.value})} style={{ width: '100%', height: '80px', background: '#1a1a1e', color: 'white', borderRadius: '12px', padding: '12px' }}></textarea>
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '14px', background: 'transparent', color: 'white' }}>CANCELAR</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>GUARDAR PRODUCTO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Finalizar Pago de la Venta */}
      {showCheckoutModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '450px', background: '#121215' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem' }}>Finalizar Transacción</h3>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>
            
            <form onSubmit={handleFinalizeSale} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asociar a un Socio (Opcional)</label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar por DNI o Nombre..." 
                    value={socioSearch}
                    onChange={e => setSocioSearch(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  {socioSearch && filteredSocios.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1e', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1100, maxHeight: '150px', overflowY: 'auto' }}>
                      {filteredSocios.map(s => (
                        <div key={s.id} onClick={() => { setCheckoutForm({...checkoutForm, socioId: s.id}); setSocioSearch(s.nombreCompleto); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {s.nombreCompleto} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({s.dni})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Método de Pago</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE_PLIN'].map(metodo => (
                    <div 
                      key={metodo}
                      onClick={() => setCheckoutForm({...checkoutForm, metodoPago: metodo})}
                      style={{ 
                        padding: '12px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                        background: checkoutForm.metodoPago === metodo ? 'rgba(255, 62, 62, 0.1)' : 'rgba(255,255,255,0.05)',
                        border: checkoutForm.metodoPago === metodo ? '1px solid var(--accent-primary)' : '1px solid var(--panel-border)',
                        color: checkoutForm.metodoPago === metodo ? 'var(--accent-primary)' : 'white'
                      }}
                    >
                      {metodo.replace('_', ' / ')}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 62, 62, 0.05)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed rgba(255, 62, 62, 0.3)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total a Pagar</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '1.1rem' }}>
                CONFIRMAR Y PAGAR
              </button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .product-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent-primary) !important;
          box-shadow: 0 10px 30px -10px rgba(255, 62, 62, 0.3);
        }
        .productos-view::-webkit-scrollbar { width: 6px; }
        .productos-view::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
      `}} />
    </div>
  );
};

export default Productos;
