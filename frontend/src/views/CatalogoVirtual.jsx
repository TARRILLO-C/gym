import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Info, X, Plus, Minus, Trash2 } from 'lucide-react';

const CatalogoVirtual = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [sliders, setSliders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchSliders();
    fetchProductos();
  }, []);

  // Simple auto-slide
  useEffect(() => {
    if (sliders.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliders.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sliders]);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/web-config');
      if (response.ok) {
        const data = await response.json();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchSliders = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/web-config/slider');
      if (response.ok) {
        const data = await response.json();
        setSliders(data);
      }
    } catch (error) {
      console.error('Error fetching sliders:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/productos/disponibles');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const filteredProductos = productos.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cart Functions
  const addToCart = (producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stock) {
          alert('No hay más stock disponible de este producto.');
          return prev;
        }
        return prev.map(item => 
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.producto.id === id) {
        const newQuantity = item.cantidad + delta;
        if (newQuantity > 0 && newQuantity <= item.producto.stock) {
          return { ...item, cantidad: newQuantity };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.producto.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.cantidad, 0);

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;
    
    let text = "Hola, deseo realizar el siguiente pedido:\n\n";
    cart.forEach(item => {
      text += `- ${item.cantidad}x ${item.producto.nombre} (S/ ${item.producto.precio.toFixed(2)} c/u) = S/ ${(item.producto.precio * item.cantidad).toFixed(2)}\n`;
    });
    text += `\n*Total a pagar: S/ ${cartTotal.toFixed(2)}*`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' }}>
      {/* Navbar Público */}
      <nav style={{ 
        backgroundColor: 'white', 
        padding: '15px 50px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />
          ) : (
            <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 'bold' }}>THE JUNGLE</h2>
          )}
        </div>
        
        {/* Cart Icon */}
        <div 
          onClick={() => setIsCartOpen(true)}
          style={{ 
            position: 'relative', 
            cursor: 'pointer',
            padding: '12px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            boxShadow: '0 4px 10px rgba(255, 62, 62, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 15px rgba(255, 62, 62, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 62, 62, 0.3)';
          }}
        >
          <ShoppingCart size={26} color="white" />
          {cartItemCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#1e293b',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white'
            }}>
              {cartItemCount}
            </span>
          )}
        </div>
      </nav>

      {/* Slider Hero */}
      {sliders.length > 0 && (
        <div style={{ position: 'relative', height: '60vh', width: '100%', overflow: 'hidden', backgroundColor: '#000' }}>
          {sliders.map((slider, index) => (
            <div 
              key={slider.id} 
              style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                opacity: index === currentSlide ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${slider.imagenUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                textAlign: 'center',
                padding: '0 20px'
              }}
            >
              <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {slider.titulo}
              </h1>
              <p style={{ fontSize: '1.5rem', maxWidth: '800px', marginBottom: '30px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {slider.descripcion}
              </p>
              {slider.textoBoton && slider.enlaceUrl && (
                <a 
                  href={slider.enlaceUrl} 
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    padding: '15px 40px',
                    borderRadius: '30px',
                    textDecoration: 'none',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 62, 62, 0.4)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  {slider.textoBoton}
                </a>
              )}
            </div>
          ))}
          
          {/* Slider Controls */}
          <div style={{ position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {sliders.map((_, idx) => (
              <button 
                key={idx} 
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  border: 'none',
                  backgroundColor: idx === currentSlide ? 'var(--accent-primary)' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid de Productos */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: 0 }}>Nuestros Productos</h2>
          
          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 20px 12px 40px',
                borderRadius: '25px',
                border: '1px solid #e2e8f0',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            <Search size={20} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
          </div>
        </div>

        {filteredProductos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
            <Info size={50} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
            <h3>No se encontraron productos disponibles.</h3>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '30px' 
          }}>
            {filteredProductos.map(producto => (
              <div key={producto.id} style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'transform 0.3s ease, boxShadow 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
              >
                <div style={{ height: '200px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                  {producto.imagenUrl ? (
                    <img src={producto.imagenUrl} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ShoppingCart size={60} color="#cbd5e1" />
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{producto.nombre}</h3>
                    <span style={{ 
                      backgroundColor: 'rgba(255, 62, 62, 0.1)', 
                      color: 'var(--accent-primary)', 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      S/ {producto.precio.toFixed(2)}
                    </span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px', height: '40px', overflow: 'hidden' }}>
                    {producto.descripcion || 'Sin descripción'}
                  </p>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      Stock: {producto.stock}
                    </span>
                    <button 
                      onClick={() => addToCart(producto)}
                      disabled={producto.stock === 0}
                      style={{
                        backgroundColor: producto.stock === 0 ? '#cbd5e1' : 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                        borderRadius: '20px',
                        cursor: producto.stock === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseOver={(e) => {
                        if (producto.stock > 0) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 62, 62, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (producto.stock > 0) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <ShoppingCart size={16} />
                      {producto.stock === 0 ? 'Agotado' : 'Añadir'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar (Drawer) */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: isCartOpen ? 0 : '-400px',
        width: '100%',
        maxWidth: '400px',
        height: '100vh',
        backgroundColor: 'white',
        boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
        transition: 'right 0.3s ease-in-out',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Cart Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={24} /> Mi Pedido
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
          >
            <X size={24} color="var(--text-muted)" />
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>
              <ShoppingCart size={50} style={{ opacity: 0.2, margin: '0 auto 15px' }} />
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {cart.map(item => (
                <div key={item.producto.id} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.producto.imagenUrl ? (
                      <img src={item.producto.imagenUrl} alt={item.producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ShoppingCart size={24} color="#cbd5e1" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.95rem' }}>{item.producto.nombre}</h4>
                    <p style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 'bold' }}>S/ {item.producto.precio.toFixed(2)}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f1f5f9', borderRadius: '20px', padding: '2px 8px' }}>
                        <button onClick={() => updateQuantity(item.producto.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><Minus size={14} /></button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.producto.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><Plus size={14} /></button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.producto.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid var(--panel-border)', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckoutWhatsApp}
              style={{
                width: '100%',
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Finalizar Pedido por WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Overlay when cart is open */}
      {isCartOpen && (
        <div 
          onClick={() => setIsCartOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999
          }}
        />
      )}

    </div>
  );
};

export default CatalogoVirtual;
