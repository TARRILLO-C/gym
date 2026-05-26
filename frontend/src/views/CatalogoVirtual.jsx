import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Info, X, Plus, Minus, Trash2 } from 'lucide-react';

const CatalogoVirtual = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sliders, setSliders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('productos');
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Solicitud state
  const [isSolicitudModalOpen, setIsSolicitudModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [solicitudForm, setSolicitudForm] = useState({
    dni: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
  });
  const [solicitudFile, setSolicitudFile] = useState(null);
  const [isSubmittingSolicitud, setIsSubmittingSolicitud] = useState(false);
  const [solicitudSuccess, setSolicitudSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchSliders();
    fetchProductos();
    fetchMembresias();
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
        if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
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
        // Filtro de seguridad: solo activos y excluir producto interno de membresías
        setProductos(data.filter(p =>
          p.activo !== false &&
          p.nombre !== 'Servicio de Membresía'
        ));
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const fetchMembresias = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/membresias');
      if (response.ok) {
        const data = await response.json();
        setMembresias(data.filter(m => m.estado === 'DISPONIBLE' && m.mostrarEnCatalogo === true));
      }
    } catch (error) {
      console.error('Error fetching membresias:', error);
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
    
    let url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (whatsappNumber) {
      url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  // Solicitud Functions
  const handleOpenSolicitud = (plan) => {
    setSelectedPlan(plan);
    setSolicitudForm({ dni: '', nombreCompleto: '', telefono: '', email: '', numeroOperacion: '' });
    setSolicitudFile(null);
    setSolicitudSuccess(false);
    setIsSolicitudModalOpen(true);
  };

  const handleDniChange = async (e) => {
    const dni = e.target.value.replace(/\D/g, ''); // only allow digits
    setSolicitudForm(prev => ({ ...prev, dni }));

    if (dni.length === 8) {
      try {
        const res = await fetch(`http://localhost:8080/api/consultas/dni/${dni}`);
        if (res.ok) {
          const data = await res.json();
          // Intentar obtener de nombreCompleto (del getter), o armarlo manualmente
          if (data.nombreCompleto) {
            setSolicitudForm(prev => ({ ...prev, nombreCompleto: data.nombreCompleto }));
          } else if (data.nombres) {
            const apellidoPat = data.ape_paterno || data.apellidoPaterno || '';
            const apellidoMat = data.ape_materno || data.apellidoMaterno || '';
            setSolicitudForm(prev => ({
              ...prev,
              nombreCompleto: `${data.nombres} ${apellidoPat} ${apellidoMat}`.trim()
            }));
          } else if (data.datos && data.datos.nombres) {
             const datos = data.datos;
             const apellidoPat = datos.ape_paterno || datos.apellidoPaterno || '';
             const apellidoMat = datos.ape_materno || datos.apellidoMaterno || '';
             setSolicitudForm(prev => ({
              ...prev,
              nombreCompleto: `${datos.nombres} ${apellidoPat} ${apellidoMat}`.trim()
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching DNI:", error);
      }
    }
  };

  const handleSolicitudSubmit = async (e) => {
    e.preventDefault();
    if (!solicitudFile) {
      alert("Debe subir un comprobante de pago");
      return;
    }
    setIsSubmittingSolicitud(true);
    try {
      // 1. Subir imagen
      const formData = new FormData();
      formData.append('file', solicitudFile);
      const uploadRes = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Error subiendo el archivo");
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // 2. Crear solicitud
      const solicitudData = {
        dni: solicitudForm.dni,
        nombreCompleto: solicitudForm.nombreCompleto,
        telefono: solicitudForm.telefono,
        email: solicitudForm.email,
        numeroOperacion: solicitudForm.numeroOperacion,
        membresiaId: selectedPlan.id,
        comprobanteUrl: fileUrl
      };

      const solRes = await fetch('http://localhost:8080/api/solicitudes-membresia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitudData)
      });
      if (!solRes.ok) throw new Error("Error creando la solicitud");

      setSolicitudSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al enviar la solicitud: " + error.message);
    } finally {
      setIsSubmittingSolicitud(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' }}>
      <style>{`
        .plan-card-img-container {
          height: 300px;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border-bottom: 1px solid #f1f5f9;
          overflow: hidden;
        }
        .plan-card-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .plan-card:hover .plan-card-img {
          transform: scale(1.80);
        }
      `}</style>
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
          {logoUrl && (
            <img src={logoUrl} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />
          )}
          <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 'bold' }}>THE JUNGLE</h2>
        </div>

        {/* Navigation links */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button 
            onClick={() => setActiveTab('productos')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'productos' ? 'var(--accent-primary)' : '#1e293b', 
              fontWeight: 'bold', fontSize: '1.1rem',
              borderBottom: activeTab === 'productos' ? '2px solid var(--accent-primary)' : 'none'
            }}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('planes')}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === 'planes' ? 'var(--accent-primary)' : '#1e293b', 
              fontWeight: 'bold', fontSize: '1.1rem',
              borderBottom: activeTab === 'planes' ? '2px solid var(--accent-primary)' : 'none'
            }}
          >
            Planes
          </button>
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

      {/* Contenido condicional según activeTab */}
      {activeTab === 'productos' && (
        <>
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
                    overflow: 'hidden',
                    backgroundColor: '#000'
                  }}
                >
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      backgroundImage: `url(${slider.imagenUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  {/* Overlay only if there is text */}
                  {(slider.titulo || slider.descripcion || slider.textoBoton) && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: 'white',
                      textAlign: 'center',
                      padding: '0 20px',
                    }}>
                      {slider.titulo && (
                        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                          {slider.titulo}
                        </h1>
                      )}
                      {slider.descripcion && (
                        <p style={{ fontSize: '1.5rem', maxWidth: '800px', marginBottom: '30px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                          {slider.descripcion}
                        </p>
                      )}
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
        </>
      )}

      {/* Grid de Planes / Membresías */}
      {activeTab === 'planes' && (
        <>
          {/* Banner de Planes */}
          <div style={{ 
            width: '100%', 
            background: 'linear-gradient(135deg, #ff3e3e 0%, #ff8a00 100%)', 
            padding: '40px 0', 
            textAlign: 'center',
            marginBottom: '40px',
            boxShadow: '0 4px 20px rgba(255, 62, 62, 0.15)'
          }}>
            <h1 style={{ 
              color: 'white', 
              fontSize: '3rem', 
              fontStyle: 'italic', 
              fontWeight: '900', 
              margin: 0,
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              NUESTROS PLANES
            </h1>
          </div>

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px 20px' }}>
            {membresias.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                <Info size={50} style={{ margin: '0 auto 20px', opacity: 0.5 }} />
                <h3>No hay planes disponibles en el catálogo en este momento.</h3>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '30px' 
              }}>
                {membresias.map(plan => (
                  <div 
                    key={plan.id} 
                    className="plan-card"
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transition: 'transform 0.3s ease, boxShadow 0.3s ease',
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
                    <div className="plan-card-img-container">
                      {plan.imagenUrl ? (
                        <img className="plan-card-img" src={plan.imagenUrl} alt={plan.nombre} />
                      ) : (
                        <div style={{ color: '#cbd5e1', fontSize: '4rem', fontWeight: 'bold' }}>PLAN</div>
                      )}
                    </div>
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{plan.nombre}</h3>
                        <span style={{ 
                          backgroundColor: 'rgba(255, 62, 62, 0.1)', 
                          color: 'var(--accent-primary)', 
                          padding: '4px 8px', 
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          S/ {plan.precio.toFixed(2)}
                        </span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px' }}>
                        {plan.descripcion || `Plan de ${plan.duracionDias} días`}
                      </p>
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                          onClick={() => handleOpenSolicitud(plan)}
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'transform 0.2s',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          Adquirir Plan
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Grid de Productos */}
      {activeTab === 'productos' && (
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
      )}


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

      {/* Full Screen Checkout Overlay */}
      {isSolicitudModalOpen && selectedPlan && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: '#f8fafc', zIndex: 1000, overflowY: 'auto'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', position: 'relative' }}>
            
            <button onClick={() => setIsSolicitudModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: '10px', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <X size={24} color="#64748b" />
            </button>

            <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '40px', color: 'var(--text-primary)' }}>Detalles de pago</h1>

            {/* Stepper Visual */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '50px', position: 'relative' }}>
              <div style={{ position: 'absolute', height: '2px', backgroundColor: '#e2e8f0', width: '60%', zIndex: 1, top: '20px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '70%', zIndex: 2 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>1</div>
                  <span style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>Planes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>2</div>
                  <span style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>Revisar Plan</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', border: '4px solid #f8fafc', marginTop: '-5px', boxShadow: '0 0 0 2px var(--accent-primary)' }}>3</div>
                  <span style={{ marginTop: '10px', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Pago</span>
                </div>
              </div>
            </div>

            {solicitudSuccess ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style={{ color: '#166534', marginBottom: '15px', fontSize: '2rem' }}>¡Pedido procesado con éxito!</h2>
                <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '30px' }}>Su comprobante está en verificación. Pronto se le confirmará su activación como socio.</p>
                <button onClick={() => setIsSolicitudModalOpen(false)} className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                  Volver al Catálogo
                </button>
              </div>
            ) : (
              <form onSubmit={handleSolicitudSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                
                {/* Lado Izquierdo: Detalles de facturación */}
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-primary)' }}>Detalles de facturación</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem' }}>DNI *</label>
                    <input type="text" required maxLength="8" style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '1rem' }}
                      value={solicitudForm.dni} onChange={handleDniChange} placeholder="Ingrese su DNI de 8 dígitos" />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem' }}>Nombre Completo *</label>
                    <input type="text" required style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '1rem' }}
                      value={solicitudForm.nombreCompleto} onChange={e => setSolicitudForm({...solicitudForm, nombreCompleto: e.target.value})} placeholder="Se autocompletará si el DNI es válido" />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem' }}>Teléfono *</label>
                    <input type="text" required maxLength="15" style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '1rem' }}
                      value={solicitudForm.telefono} onChange={e => setSolicitudForm({...solicitudForm, telefono: e.target.value})} />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem' }}>Dirección de correo electrónico</label>
                    <input type="email" style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '1rem' }}
                      value={solicitudForm.email} onChange={e => setSolicitudForm({...solicitudForm, email: e.target.value})} />
                  </div>
                </div>

                {/* Lado Derecho: Tu Pedido */}
                <div>
                  <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: 'var(--text-primary)' }}>Tu pedido</h3>
                    
                    {/* Summary Table */}
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <span>PRODUCTO</span>
                      <span>SUBTOTAL</span>
                    </div>
                    
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedPlan.nombre} × 1</p>
                      </div>
                      <span style={{ fontWeight: '500', color: '#475569' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                    </div>

                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>Subtotal</span>
                      <span style={{ fontWeight: 'bold', color: '#475569' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                    </div>

                    <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Total</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                    </div>

                    {/* Metodos de pago (Yape/Transferencia) */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: '#475569' }}>
                        Realiza el pago a nuestras cuentas y adjunta el comprobante para habilitar tu suscripción.
                      </p>
                      
                      <div style={{ marginBottom: '15px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #6f42c1' }}>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#6f42c1' }}>Yape / Plin</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>939 868 702 <span style={{fontSize:'0.9rem', color:'#64748b', fontWeight:'normal'}}>(Carlos B.)</span></p>
                      </div>

                      <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#f59e0b' }}>BCP</p>
                        <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>191-0000000-0-00</p>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem', fontWeight: 'bold' }}>Número de Operación *</label>
                        <input type="text" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '1rem' }}
                          value={solicitudForm.numeroOperacion} onChange={e => setSolicitudForm({...solicitudForm, numeroOperacion: e.target.value})} placeholder="Ej: 0123456" />
                      </div>
                      
                      <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontSize: '0.95rem', fontWeight: 'bold' }}>Comprobante de Pago *</label>
                        <input type="file" accept="image/*,.pdf" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}
                          onChange={e => setSolicitudFile(e.target.files[0])} />
                      </div>

                      <button type="submit" disabled={isSubmittingSolicitud} style={{
                        width: '100%', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none',
                        padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem',
                        cursor: isSubmittingSolicitud ? 'not-allowed' : 'pointer', opacity: isSubmittingSolicitud ? 0.7 : 1,
                        transition: 'background-color 0.2s', boxShadow: '0 4px 6px rgba(255, 62, 62, 0.2)'
                      }}>
                        {isSubmittingSolicitud ? 'Procesando...' : 'Finalizar Pedido'}
                      </button>
                    </div>

                  </div>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CatalogoVirtual;
