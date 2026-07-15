import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Info, X, Plus, Minus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import './CatalogoVirtual.css';

const CatalogoVirtual = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [yapeNumber, setYapeNumber] = useState('');
  const [yapeTitular, setYapeTitular] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [cuentaTitular, setCuentaTitular] = useState('');
  const [sliders, setSliders] = useState([]);
  const [productos, setProductos] = useState([]);
  const [membresias, setMembresias] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('productos');
  
  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gym_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('gym_cart', JSON.stringify(cart));
    } catch (e) {
      console.error("Error saving cart to sessionStorage:", e);
    }
  }, [cart]);

  // Solicitud state
  const [isSolicitudModalOpen, setIsSolicitudModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(2);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [solicitudForm, setSolicitudForm] = useState({
    dni: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
  });
  const [solicitudFile, setSolicitudFile] = useState(null);
  const [solicitudPreview, setSolicitudPreview] = useState('');
  const [isSubmittingSolicitud, setIsSubmittingSolicitud] = useState(false);
  const [solicitudSuccess, setSolicitudSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [solicitudSubmitError, setSolicitudSubmitError] = useState('');

  // Product checkout state
  const [isProductCheckoutOpen, setIsProductCheckoutOpen] = useState(false);
  const [productCheckoutStep, setProductCheckoutStep] = useState(1);
  const [productForm, setProductForm] = useState({
    dni: '',
    nombreCompleto: '',
    telefono: '',
    email: '',
    numeroOperacion: ''
  });
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [productSuccess, setProductSuccess] = useState(false);
  const [productValidationErrors, setProductValidationErrors] = useState({});
  const [productSubmitError, setProductSubmitError] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchSliders();
    fetchProductos();
    fetchMembresias();

    const handleFocus = () => {
      fetchProductos();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
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
      const response = await fetch(`${API_BASE_URL}/web-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.yapeNumber) setYapeNumber(data.yapeNumber);
        if (data.yapeTitular) setYapeTitular(data.yapeTitular);
        if (data.numeroCuenta) setNumeroCuenta(data.numeroCuenta);
        if (data.cuentaTitular) setCuentaTitular(data.cuentaTitular);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchSliders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/web-config/slider`);
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
      const response = await fetch(`${API_BASE_URL}/productos/disponibles`);
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
      const response = await fetch(`${API_BASE_URL}/membresias`);
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
    // setIsCartOpen(true); // Desactivado a petición del usuario para no abrir el sidebar automáticamente
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
    
    // Open product checkout modal instead of WhatsApp
    setProductForm({ dni: '', nombreCompleto: '', telefono: '', email: '', numeroOperacion: '' });
    setProductFile(null);
    setProductSuccess(false);
    setProductValidationErrors({});
    setProductSubmitError('');
    setProductCheckoutStep(1);
    setIsProductCheckoutOpen(true);
  };

  const handleProductDniChange = async (e) => {
    const dni = e.target.value.replace(/\D/g, '');
    setProductForm(prev => ({ ...prev, dni }));

    if (dni.length === 8) {
      try {
        // 1. Intentar buscar en la base de datos local de socios del gimnasio
        const localRes = await fetch(`${API_BASE_URL}/socios/public/dni/${dni}`);
        if (localRes.ok) {
          const socio = await localRes.json();
          if (socio && socio.nombreCompleto) {
            setProductForm(prev => ({
              ...prev,
              nombreCompleto: socio.nombreCompleto,
              telefono: socio.telefono || '',
              email: socio.email || ''
            }));
            return;
          }
        }

        // 2. Si no existe, buscar en la API de DNI externa (Reniec)
        const res = await fetch(`${API_BASE_URL}/consultas/dni/${dni}`);
        if (res.ok) {
          const data = await res.json();
          const nombre = data.nombreCompleto || data.datos?.nombreCompleto;
          if (nombre) {
            setProductForm(prev => ({ ...prev, nombreCompleto: nombre }));
          } else if (data.nombres) {
            const apellidoPat = data.ape_paterno || data.apellidoPaterno || '';
            const apellidoMat = data.ape_materno || data.apellidoMaterno || '';
            setProductForm(prev => ({
              ...prev,
              nombreCompleto: `${data.nombres} ${apellidoPat} ${apellidoMat}`.trim()
            }));
          } else if (data.datos && data.datos.nombres) {
             const datos = data.datos;
             const apellidoPat = datos.ape_paterno || datos.apellidoPaterno || '';
             const apellidoMat = datos.ape_materno || datos.apellidoMaterno || '';
             setProductForm(prev => ({
              ...prev,
              nombreCompleto: `${datos.nombres} ${apellidoPat} ${apellidoMat}`.trim()
            }));
          }
        }
      } catch (error) {
        console.error("Error al buscar información del cliente por DNI:", error);
      }
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    
    if (!productForm.dni || productForm.dni.length !== 8) {
      errors.dni = "El DNI debe tener exactamente 8 dígitos";
    }
    
    if (!productForm.nombreCompleto || productForm.nombreCompleto.trim() === '') {
      errors.nombreCompleto = "El nombre completo es requerido";
    }
    
    if (!productForm.telefono || productForm.telefono.length !== 9) {
      errors.telefono = "El teléfono debe tener exactamente 9 dígitos";
    }
    
    if (!productForm.numeroOperacion || productForm.numeroOperacion.length < 6 || productForm.numeroOperacion.length > 15) {
      errors.numeroOperacion = "El número de operación debe tener entre 6 y 15 dígitos";
    }
    
    if (!productFile) {
      errors.comprobante = "Debe subir un comprobante de pago";
    }
    
    if (Object.keys(errors).length > 0) {
      setProductValidationErrors(errors);
      return;
    }
    
    setProductValidationErrors({});
    setProductSubmitError('');
    setIsSubmittingProduct(true);
    try {
      // 1. Subir imagen
      const formData = new FormData();
      formData.append('file', productFile);
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Error subiendo el archivo");
      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // 2. Crear solicitud de compra de productos
      const solicitudData = {
        dni: productForm.dni,
        nombreCompleto: productForm.nombreCompleto,
        telefono: productForm.telefono,
        email: productForm.email,
        numeroOperacion: productForm.numeroOperacion,
        items: cart.map(item => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
          precioUnitario: item.producto.precio
        })),
        total: cartTotal,
        comprobanteUrl: fileUrl
      };

      const solRes = await fetch(`${API_BASE_URL}/solicitudes-producto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitudData)
      });
      if (!solRes.ok) {
        let errMsg = 'Error creando la solicitud';
        try {
          const errBody = await solRes.json();
          errMsg = errBody.mensaje || errBody.message || errMsg;
        } catch {
          errMsg = await solRes.text() || errMsg;
        }
        throw new Error(errMsg);
      }

      setProductSuccess(true);
      setCart([]);
      if (productPreview) URL.revokeObjectURL(productPreview);
      setProductPreview('');
      setProductFile(null);
    } catch (error) {
      console.error(error);
      setProductSubmitError(error.message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Solicitud Functions
  const handleOpenSolicitud = (plan) => {
    setSelectedPlan(plan);
    setSolicitudForm({ dni: '', nombreCompleto: '', telefono: '', email: '', numeroOperacion: '' });
    setSolicitudFile(null);
    if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
    setSolicitudPreview('');
    setSolicitudSuccess(false);
    setValidationErrors({});
    setSolicitudSubmitError('');
    setCheckoutStep(2);
    setIsSolicitudModalOpen(true);
  };

  const handleDniChange = async (e) => {
    const dni = e.target.value.replace(/\D/g, ''); // only allow digits
    setSolicitudForm(prev => ({ ...prev, dni }));

    if (dni.length === 8) {
      try {
        // 1. Intentar buscar en la base de datos local de socios del gimnasio
        const localRes = await fetch(`${API_BASE_URL}/socios/public/dni/${dni}`);
        if (localRes.ok) {
          const socio = await localRes.json();
          if (socio && socio.nombreCompleto) {
            setSolicitudForm(prev => ({
              ...prev,
              nombreCompleto: socio.nombreCompleto,
              telefono: socio.telefono || '',
              email: socio.email || ''
            }));
            return;
          }
        }

        // 2. Si no existe, buscar en la API de DNI externa (Reniec)
        const res = await fetch(`${API_BASE_URL}/consultas/dni/${dni}`);
        if (res.ok) {
          const data = await res.json();
          const nombre = data.nombreCompleto || data.datos?.nombreCompleto;
          if (nombre) {
            setSolicitudForm(prev => ({ ...prev, nombreCompleto: nombre }));
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
        console.error("Error al buscar información del cliente por DNI:", error);
      }
    }
  };

  const handleSolicitudSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    
    // Validación de DNI
    if (!solicitudForm.dni || solicitudForm.dni.length !== 8) {
      errors.dni = "El DNI debe tener exactamente 8 dígitos";
    }
    
    // Validación de nombre completo
    if (!solicitudForm.nombreCompleto || solicitudForm.nombreCompleto.trim() === '') {
      errors.nombreCompleto = "El nombre completo es requerido";
    }
    
    // Validación de teléfono: exactamente 9 dígitos
    if (!solicitudForm.telefono || solicitudForm.telefono.length !== 9) {
      errors.telefono = "El teléfono debe tener exactamente 9 dígitos";
    }
    
    // Validación de número de operación: entre 6 y 15 dígitos
    if (!solicitudForm.numeroOperacion || solicitudForm.numeroOperacion.length < 6 || solicitudForm.numeroOperacion.length > 15) {
      errors.numeroOperacion = "El número de operación debe tener entre 6 y 15 dígitos";
    }
    
    if (!solicitudFile) {
      errors.comprobante = "Debe subir un comprobante de pago";
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    setSolicitudSubmitError('');
    setIsSubmittingSolicitud(true);
    try {
      // 1. Subir imagen
      const formData = new FormData();
      formData.append('file', solicitudFile);
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
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

      const solRes = await fetch(`${API_BASE_URL}/solicitudes-membresia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solicitudData)
      });
      if (!solRes.ok) throw new Error("Error creando la solicitud");

      setSolicitudSuccess(true);
      if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
      setSolicitudPreview('');
      setSolicitudFile(null);
    } catch (error) {
      console.error(error);
      setSolicitudSubmitError(error.message);
    } finally {
      setIsSubmittingSolicitud(false);
    }
  };

  return (
    <div className="catalog-body">
      {/* Navbar Público */}
      <nav className="catalog-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo" style={{ height: '44px', objectFit: 'contain' }} />
          )}
          <h2 style={{ margin: 0 }}>THE JUNGLE</h2>
        </div>

        {/* Navigation Tabs */}
        <div className="catalog-tab-bar">
          <button
            className={`catalog-tab ${activeTab === 'productos' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('productos')}
          >
            🛒 Productos
          </button>
          <button
            className={`catalog-tab ${activeTab === 'planes' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('planes')}
          >
            🏋️ Planes
          </button>
        </div>

        {/* Cart Icon */}
        <button
          className="cart-float-btn"
          onClick={() => setIsCartOpen(true)}
          style={{ position: 'relative', bottom: 'auto', right: 'auto', width: '48px', height: '48px' }}
          title="Ver carrito"
        >
          <ShoppingCart size={22} color="white" />
          {cartItemCount > 0 && (
            <span className="badge">{cartItemCount}</span>
          )}
        </button>
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
                        <h1 className="catalog-hero-title" style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                          {slider.titulo}
                        </h1>
                      )}
                      {slider.descripcion && (
                        <p className="catalog-hero-desc" style={{ fontSize: '1.5rem', maxWidth: '800px', marginBottom: '30px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                          {slider.descripcion}
                        </p>
                      )}
                      {slider.textoBoton && slider.enlaceUrl && (
                        <a 
                          href={slider.enlaceUrl} 
                          className="catalog-hero-btn"
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
          <div className="catalog-section-banner">
            <h1 className="catalog-title">ELIGE TU PLAN</h1>
            <p className="catalog-subtitle">Transforma tu cuerpo · Supera tus límites · Únete a THE JUNGLE</p>
          </div>

          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 80px' }}>
            {membresias.length === 0 ? (
              <div className="catalog-empty">
                <Info size={64} />
                <h3>NO HAY PLANES DISPONIBLES</h3>
              </div>
            ) : (
              <div className="catalog-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {membresias.map((plan, idx) => (
                  <div
                    key={plan.id}
                    className={`plan-card ${idx === 1 ? 'featured' : ''}`}
                    style={{ animationDelay: `${idx * 0.08}s` }}
                    onClick={() => handleOpenSolicitud(plan)}
                  >
                    <div className="plan-card-img-container">
                      {plan.imagenUrl ? (
                        <img className="plan-card-img" src={plan.imagenUrl} alt={plan.nombre} />
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.06)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '5rem', letterSpacing: '4px' }}>GYM</div>
                      )}
                      {idx === 1 && (
                        <div style={{
                          position: 'absolute', top: 14, right: 14,
                          background: 'linear-gradient(135deg,#ff2d2d,#ff7a00)',
                          color: 'white', fontWeight: 900, fontSize: '0.72rem',
                          padding: '4px 14px', borderRadius: '4px', letterSpacing: '2px',
                          textTransform: 'uppercase',
                          clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)'
                        }}>★ MÁS POPULAR</div>
                      )}
                    </div>

                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', zIndex: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{plan.nombre}</h3>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '1.9rem', lineHeight: 1, color: '#ff2d2d', letterSpacing: '1px' }}>S/ {plan.precio.toFixed(2)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '1px', textTransform: 'uppercase' }}>{plan.duracionDias} días</div>
                        </div>
                      </div>

                      <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6, flex: 1 }}>
                        {plan.descripcion || `Acceso completo al gimnasio por ${plan.duracionDias} días.`}
                      </p>

                      <button
                        className="btn-add-cart"
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.9rem', letterSpacing: '2px', clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)' }}
                        onClick={(e) => { e.stopPropagation(); handleOpenSolicitud(plan); }}
                      >
                        🔥 INSCRIBIRME AHORA
                      </button>
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
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 80px' }}>
          <div className="catalog-section-banner">
            <h1 className="catalog-title">NUESTROS PRODUCTOS</h1>
            <p className="catalog-subtitle">Suplementos · Equipamiento · Accesorios de Gym</p>
          </div>

          <div className="catalog-search-wrapper">
            <input
              className="catalog-search-input"
              type="text"
              placeholder="🔍  Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''))}
            />
          </div>

          {filteredProductos.length === 0 ? (
            <div className="catalog-empty">
              <ShoppingCart size={64} />
              <h3>NO HAY PRODUCTOS DISPONIBLES</h3>
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredProductos.map((producto, idx) => {
                const stockStatus = producto.stock === 0 ? 'no-stock' : producto.stock <= 5 ? 'low-stock' : 'in-stock';
                const stockLabel  = producto.stock === 0 ? 'Agotado' : producto.stock <= 5 ? `¡Solo ${producto.stock}!` : `${producto.stock} disponibles`;
                const stockIcon   = producto.stock === 0 ? '✕' : producto.stock <= 5 ? '⚡' : '✓';
                return (
                  <div key={producto.id} className="product-card" style={{ animationDelay: `${idx * 0.06}s` }}>
                    <div className="product-card-blob"></div>
                    <div className="product-card-bg">
                      <div className="product-card-img-wrapper">
                        {producto.imagenUrl ? (
                          <img src={producto.imagenUrl} alt={producto.nombre} />
                        ) : (
                          <ShoppingCart size={56} color="rgba(255,255,255,0.06)" />
                        )}
                        {producto.stock <= 5 && producto.stock > 0 && (
                          <span className="product-card-badge">⚡ Últimas unidades</span>
                        )}
                        <span className="product-card-price">S/ {producto.precio.toFixed(2)}</span>
                      </div>
                      <div className="product-card-body">
                        <h3 className="product-card-name">{producto.nombre}</h3>
                        <p className="product-card-desc">{producto.descripcion || 'Producto de alta calidad para tu entrenamiento.'}</p>
                        <div className="product-card-footer">
                          <span className={`product-card-stock ${stockStatus}`}>{stockIcon} {stockLabel}</span>
                          <button
                            className="btn-add-cart"
                            onClick={(e) => { e.stopPropagation(); addToCart(producto); }}
                            disabled={producto.stock === 0}
                          >
                            <ShoppingCart size={15} />
                            {producto.stock === 0 ? 'Agotado' : 'Añadir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
          

      {/* Cart Sidebar (Drawer) */}
      <div className="cart-drawer" style={{
        position: 'fixed',
        top: 0,
        right: isCartOpen ? 0 : '-400px',
        width: '100%',
        maxWidth: '400px',
        height: '100vh',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
        transition: 'right 0.3s ease-in-out',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-main)'
      }}>
        {/* Cart Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
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
                <div key={item.producto.id} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px' }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.producto.imagenUrl ? (
                      <img src={item.producto.imagenUrl} alt={item.producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ShoppingCart size={24} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.producto.nombre}</h4>
                    <p style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 'bold' }}>S/ {item.producto.precio.toFixed(2)}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '20px', padding: '2px 8px' }}>
                        <button onClick={() => updateQuantity(item.producto.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-main)' }}><Minus size={14} /></button>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '20px', textAlign: 'center', color: 'var(--text-main)' }}>{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.producto.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-main)' }}><Plus size={14} /></button>
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
          <div style={{ padding: '20px', borderTop: '1px solid var(--panel-border)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              <span>Total:</span>
              <span style={{ color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckoutWhatsApp}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent-primary)',
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
                boxShadow: '0 4px 15px rgba(255, 62, 62, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Finalizar compra
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
          backgroundColor: 'var(--bg-color)', background: 'var(--body-bg-gradient)', zIndex: 1000, overflowY: 'auto',
          transition: 'background-color 0.3s ease', color: 'var(--text-main)'
        }}>
          {/* Header para Paso 2 */}
          {checkoutStep === 2 && (
            <div className="checkout-modal-header" style={{ width: '100%', padding: '40px 20px 40px', textAlign: 'center' }}>
              <h1 className="checkout-modal-title" style={{ color: 'var(--text-main)', fontSize: '2.5rem', margin: '0' }}>Detalles de la compra</h1>
            </div>
          )}

          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px', position: 'relative' }}>
            
            <button onClick={() => {
              setIsSolicitudModalOpen(false);
              if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
              setSolicitudPreview('');
              setSolicitudFile(null);
            }} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50, background: 'none', border: 'none', cursor: 'pointer', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border)', borderRadius: '50%', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
              <X size={24} color="var(--text-muted)" />
            </button>

            {checkoutStep === 3 && (
               <h1 className="checkout-modal-title" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '40px', marginTop: '40px', color: 'var(--text-main)' }}>Detalles de pago</h1>
            )}

            {/* Stepper Visual */}
            <div className="checkout-stepper-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '50px', position: 'relative' }}>
              <div style={{ position: 'absolute', height: '2px', backgroundColor: 'var(--panel-border)', width: '60%', zIndex: 1, top: '20px' }}></div>
              <div style={{ position: 'absolute', height: '2px', backgroundColor: 'var(--accent-primary)', width: checkoutStep === 2 ? '30%' : '60%', zIndex: 2, top: '20px', left: '20%', transition: 'width 0.3s ease' }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '70%', zIndex: 3 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setIsSolicitudModalOpen(false)}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <span style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>Planes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => setCheckoutStep(2)}>
                  <div style={{ width: checkoutStep === 2 ? '50px' : '40px', height: checkoutStep === 2 ? '50px' : '40px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', border: checkoutStep === 2 ? '4px solid var(--bg-color)' : 'none', marginTop: checkoutStep === 2 ? '-5px' : '0', boxShadow: checkoutStep === 2 ? '0 0 0 2px var(--accent-primary)' : 'none', transition: 'all 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  </div>
                  <span style={{ marginTop: '10px', fontSize: checkoutStep === 2 ? '1rem' : '0.9rem', color: 'var(--text-main)', fontWeight: checkoutStep === 2 ? 'bold' : '500' }}>Revisar Plan</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: checkoutStep === 3 ? 'pointer' : 'not-allowed' }} onClick={() => { if(checkoutStep === 3) setCheckoutStep(3) }}>
                  <div style={{ width: checkoutStep === 3 ? '50px' : '40px', height: checkoutStep === 3 ? '50px' : '40px', borderRadius: '50%', backgroundColor: checkoutStep === 3 ? 'var(--accent-primary)' : '#334155', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', border: checkoutStep === 3 ? '4px solid var(--bg-color)' : 'none', marginTop: checkoutStep === 3 ? '-5px' : '0', boxShadow: checkoutStep === 3 ? '0 0 0 2px var(--accent-primary)' : 'none', transition: 'all 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  </div>
                  <span style={{ marginTop: '10px', fontSize: checkoutStep === 3 ? '1rem' : '0.9rem', color: checkoutStep === 2 ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: checkoutStep === 3 ? 'bold' : '500' }}>Pago</span>
                </div>
              </div>
            </div>

            {solicitudSuccess ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', backdropFilter: 'var(--glass-blur)', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', color: 'var(--text-main)' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 20px rgba(34, 197, 94, 0.1)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style={{ color: '#22c55e', marginBottom: '15px', fontSize: '2rem' }}>¡Pedido procesado con éxito!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>Su comprobante está en verificación. Pronto se le confirmará su activación como socio.</p>
                <button onClick={() => setIsSolicitudModalOpen(false)} className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                  Volver al Catálogo
                </button>
              </div>
            ) : (
              <>
                {/* ----------------- PASO 2: REVISAR PLAN ----------------- */}
                {checkoutStep === 2 && (
                  <div className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'start' }}>
                    
                    {/* Tabla de Productos */}
                    <div className="checkout-table-container" style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                      <table className="checkout-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--panel-border)' }}>
                          <tr>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.9rem', width: '50px' }}></th>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Producto</th>
                            <th style={{ padding: '20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Precio</th>
                            <th style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cantidad</th>
                            <th style={{ padding: '20px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                            <td style={{ padding: '20px', textAlign: 'center' }}>
                              <button onClick={() => setIsSolicitudModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>×</button>
                            </td>
                            <td style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '50px', height: '50px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--panel-border)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center', padding: '5px' }}>
                                  PLAN<br/>GYM
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-main)' }}>{selectedPlan.nombre}</p>
                                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>MESES: {selectedPlan.duracionMeses}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '20px', color: 'var(--text-main)' }}>S/ {selectedPlan.precio.toFixed(2)}</td>
                            <td style={{ padding: '20px', textAlign: 'center', color: 'var(--text-main)' }}>1</td>
                            <td style={{ padding: '20px', textAlign: 'right', color: 'var(--text-main)' }}>S/ {selectedPlan.precio.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Totales del Carrito */}
                    <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: 'var(--text-main)' }}>Totales del carrito</h3>
                      
                      <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>SUBTOTAL</span>
                        <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                      </div>

                      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)', fontSize: '0.9rem' }}>TOTAL</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.2rem' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                      </div>

                      <button onClick={() => setCheckoutStep(3)} style={{
                        width: '100%', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none',
                        padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem',
                        cursor: 'pointer', transition: 'background-color 0.2s', boxShadow: '0 4px 15px rgba(255, 62, 62, 0.3)'
                      }}>
                        FINALIZAR COMPRA
                      </button>
                    </div>

                  </div>
                )}

                {/* ----------------- PASO 3: PAGO ----------------- */}
                {checkoutStep === 3 && (
                  <form onSubmit={handleSolicitudSubmit} className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                    
                    {/* Lado Izquierdo: Detalles de facturación */}
                    <div>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-main)' }}>Detalles de facturación</h3>
                      
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>DNI *</label>
                        <div style={{ position: 'relative' }}>
                          <input type="text" required maxLength="8" style={{ 
                            width: '100%', 
                            padding: '14px 16px', 
                            borderRadius: '10px', 
                            border: validationErrors.dni ? '2px solid #dc2626' : solicitudForm.dni.length === 8 ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                            backgroundColor: 'rgba(255,255,255,0.02)', 
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease',
                            boxShadow: validationErrors.dni ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                          }}
                            value={solicitudForm.dni} onChange={handleDniChange} placeholder="Ingrese su DNI de 8 dígitos" />
                          {solicitudForm.dni.length === 8 && !validationErrors.dni && (
                            <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                          )}
                        </div>
                        {validationErrors.dni && (
                          <div style={{ 
                            marginTop: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: '#ef4444', 
                            fontSize: '0.85rem', 
                            fontWeight: '500', 
                            backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(239, 68, 68, 0.15)'
                          }}>
                            <AlertCircle size={16} />
                            <span>{validationErrors.dni}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Nombre Completo *</label>
                        <div style={{ position: 'relative' }}>
                          <input type="text" required disabled style={{ 
                            width: '100%', 
                            padding: '14px 16px', 
                            borderRadius: '10px', 
                            border: validationErrors.nombreCompleto ? '2px solid #dc2626' : (solicitudForm.nombreCompleto.length > 0 && !validationErrors.nombreCompleto) ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                            backgroundColor: 'rgba(255,255,255,0.05)', 
                            color: 'var(--text-muted)',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease',
                            boxShadow: validationErrors.nombreCompleto ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none',
                            cursor: 'not-allowed'
                          }}
                            value={solicitudForm.nombreCompleto} placeholder="Se autocompletará automáticamente" />
                          {solicitudForm.nombreCompleto.length > 0 && !validationErrors.nombreCompleto && (
                            <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                          )}
                        </div>
                        {validationErrors.nombreCompleto && (
                          <div style={{ 
                            marginTop: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: '#ef4444', 
                            fontSize: '0.85rem', 
                            fontWeight: '500', 
                            backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(239, 68, 68, 0.15)'
                          }}>
                            <AlertCircle size={16} />
                            <span>{validationErrors.nombreCompleto}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Teléfono *</label>
                        <div style={{ position: 'relative' }}>
                          <input type="text" required maxLength="9" style={{ 
                            width: '100%', 
                            padding: '14px 16px', 
                            borderRadius: '10px', 
                            border: validationErrors.telefono ? '2px solid #dc2626' : solicitudForm.telefono.length === 9 ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                            backgroundColor: 'rgba(255,255,255,0.02)', 
                            color: 'var(--text-main)',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s ease',
                            boxShadow: validationErrors.telefono ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                          }}
                            value={solicitudForm.telefono} onChange={e => {setSolicitudForm({...solicitudForm, telefono: e.target.value.replace(/\D/g, '')}); setValidationErrors({...validationErrors, telefono: null});}} placeholder="9 dígitos" />
                          {solicitudForm.telefono.length === 9 && !validationErrors.telefono && (
                            <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                          )}
                        </div>
                        {validationErrors.telefono && (
                          <div style={{ 
                            marginTop: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: '#ef4444', 
                            fontSize: '0.85rem', 
                            fontWeight: '500', 
                            backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                            padding: '10px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(239, 68, 68, 0.15)'
                          }}>
                            <AlertCircle size={16} />
                            <span>{validationErrors.telefono}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Dirección de correo electrónico</label>
                        <input type="email" style={{ 
                          width: '100%', 
                          padding: '14px 16px', 
                          borderRadius: '10px', 
                          border: '2px solid var(--panel-border)', 
                          backgroundColor: 'rgba(255,255,255,0.02)', 
                          color: 'var(--text-main)',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease'
                        }}
                          value={solicitudForm.email} onChange={e => setSolicitudForm({...solicitudForm, email: e.target.value})} placeholder="ejemplo@correo.com" />
                      </div>
                    </div>

                    {/* Lado Derecho: Tu Pedido */}
                    <div>
                      <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: 'var(--text-main)' }}>Tu pedido</h3>
                        
                        {/* Summary Table */}
                        <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <span>PRODUCTO</span>
                          <span>SUBTOTAL</span>
                        </div>
                        
                        <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-main)' }}>{selectedPlan.nombre} × 1</p>
                          </div>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                        </div>

                        <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Subtotal</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                        </div>

                        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Total</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>S/ {selectedPlan.precio.toFixed(2)}</span>
                        </div>

                        {/* Metodos de pago (Yape/Transferencia) */}
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '20px', borderRadius: '12px' }}>
                          <p style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                            Realiza el pago a nuestras cuentas y adjunta el comprobante para habilitar tu suscripción.
                          </p>
                          
                          <div style={{ marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #6f42c1' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#6f42c1' }}>Yape / Plin</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                              {yapeNumber || '---'} {yapeTitular ? <span style={{fontSize:'0.9rem', color:'var(--text-muted)', fontWeight:'normal'}}>({yapeTitular})</span> : null}
                            </p>
                          </div>

                          <div style={{ marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#f59e0b' }}>Cuenta Bancaria</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                              {numeroCuenta || '---'} {cuentaTitular ? <span style={{fontSize:'0.9rem', color:'var(--text-muted)', fontWeight:'normal'}}>({cuentaTitular})</span> : null}
                            </p>
                          </div>

                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Número de Operación *</label>
                            <div style={{ position: 'relative' }}>
                              <input type="text" required maxLength="15" style={{ 
                                width: '100%', 
                                padding: '14px 16px', 
                                borderRadius: '10px', 
                                border: validationErrors.numeroOperacion ? '2px solid #dc2626' : (solicitudForm.numeroOperacion.length >= 6 && solicitudForm.numeroOperacion.length <= 15) ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                                backgroundColor: 'rgba(255,255,255,0.02)', 
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s ease',
                                boxShadow: validationErrors.numeroOperacion ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                              }}
                                value={solicitudForm.numeroOperacion} onChange={e => {setSolicitudForm({...solicitudForm, numeroOperacion: e.target.value.replace(/\D/g, '')}); setValidationErrors({...validationErrors, numeroOperacion: null});}} placeholder="De 6 a 15 dígitos" />
                              {solicitudForm.numeroOperacion.length >= 6 && solicitudForm.numeroOperacion.length <= 15 && !validationErrors.numeroOperacion && (
                                <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                              )}
                            </div>
                            {validationErrors.numeroOperacion && (
                              <div style={{ 
                                marginTop: '8px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                color: '#ef4444', 
                                fontSize: '0.85rem', 
                                fontWeight: '500', 
                                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                padding: '10px 14px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(239, 68, 68, 0.15)'
                              }}>
                                <AlertCircle size={16} />
                                <span>{validationErrors.numeroOperacion}</span>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Comprobante de Pago *</label>
                            <div style={{ position: 'relative' }}>
                              <input 
                                key={solicitudFile ? 'has-file' : 'no-file'}
                                type="file" 
                                accept="image/*" 
                                required={!solicitudFile}
                                style={{ 
                                  width: '100%', 
                                  padding: '14px 16px', 
                                  borderRadius: '10px', 
                                  border: validationErrors.comprobante ? '2px solid #dc2626' : solicitudFile ? '2px solid #16a34a' : '2px dashed var(--panel-border)', 
                                  backgroundColor: 'rgba(255,255,255,0.02)', 
                                  cursor: 'pointer',
                                  color: 'var(--text-main)',
                                  fontSize: '0.9rem',
                                  transition: 'all 0.2s ease',
                                  boxShadow: validationErrors.comprobante ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                                }}
                                onChange={e => {
                                  const file = e.target.files[0];
                                  if (file && !file.type.startsWith('image/')) {
                                    alert('Solo se permiten archivos de imagen (PNG, JPG, JPEG, WEBP, GIF, BMP).');
                                    e.target.value = '';
                                    return;
                                  }
                                  setSolicitudFile(file);
                                  setValidationErrors({...validationErrors, comprobante: null});
                                  if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
                                  if (file && file.type.startsWith('image/')) {
                                    setSolicitudPreview(URL.createObjectURL(file));
                                  } else {
                                    setSolicitudPreview('');
                                  }
                                }} 
                              />
                              {solicitudFile && !validationErrors.comprobante && (
                                <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                              )}
                            </div>
                            
                            {/* Vista previa de imagen del comprobante */}
                            {solicitudPreview && (
                              <div style={{ 
                                marginTop: '15px', 
                                borderRadius: '12px', 
                                border: '2px solid var(--panel-border)', 
                                padding: '12px', 
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                              }}>
                                <p style={{ alignSelf: 'flex-start', margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista previa del comprobante:</p>
                                <img 
                                  src={solicitudPreview} 
                                  alt="Vista previa del comprobante" 
                                  style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '220px', 
                                    borderRadius: '8px', 
                                    objectFit: 'contain',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
                                  }} 
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSolicitudFile(null);
                                    if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
                                    setSolicitudPreview('');
                                  }}
                                  style={{
                                    marginTop: '10px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fef2e2',
                                    color: '#ef4444',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                >
                                  <Trash2 size={14} /> Quitar imagen
                                </button>
                              </div>
                            )}

                            {/* Vista previa de PDF */}
                            {solicitudFile && !solicitudPreview && (
                              <div style={{ 
                                marginTop: '15px', 
                                borderRadius: '12px', 
                                border: '2px solid var(--panel-border)', 
                                padding: '12px', 
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Comprobante PDF</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{solicitudFile.name}</p>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setSolicitudFile(null);
                                    if (solicitudPreview) URL.revokeObjectURL(solicitudPreview);
                                    setSolicitudPreview('');
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #fee2e2',
                                    backgroundColor: '#fef2f2',
                                    color: '#ef4444',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                >
                                  Quitar
                                </button>
                              </div>
                            )}
                            {validationErrors.comprobante && (
                              <div style={{ 
                                marginTop: '8px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                color: '#ef4444', 
                                fontSize: '0.85rem', 
                                fontWeight: '500', 
                                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                padding: '10px 14px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(239, 68, 68, 0.15)'
                              }}>
                                <AlertCircle size={16} />
                                <span>{validationErrors.comprobante}</span>
                              </div>
                            )}
                          </div>

                          {solicitudSubmitError && (
                            <div style={{
                              marginBottom: '16px',
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              gap: '12px',
                              color: '#ef4444', 
                              fontSize: '0.95rem', 
                              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                              padding: '16px', 
                              borderRadius: '12px', 
                              border: '1px solid rgba(239, 68, 68, 0.15)'
                            }}>
                              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontWeight: '600' }}>Error al procesar la solicitud</span>
                                <span style={{ opacity: 0.9 }}>{solicitudSubmitError}</span>
                              </div>
                            </div>
                          )}

                          <button type="submit" disabled={isSubmittingSolicitud} style={{
                            width: '100%', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none',
                            padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem',
                            cursor: isSubmittingSolicitud ? 'not-allowed' : 'pointer', opacity: isSubmittingSolicitud ? 0.7 : 1,
                            transition: 'background-color 0.2s', boxShadow: '0 4px 15px rgba(255, 62, 62, 0.3)'
                          }}>
                            {isSubmittingSolicitud ? 'Procesando...' : 'Finalizar Pedido'}
                          </button>
                        </div>

                      </div>
                    </div>

                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Checkout Modal */}
      {isProductCheckoutOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'var(--bg-color)', zIndex: 1000, overflowY: 'auto',
          transition: 'background-color 0.3s ease'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px', position: 'relative' }}>
            
            <button onClick={() => {
              setIsProductCheckoutOpen(false);
              if (productPreview) URL.revokeObjectURL(productPreview);
              setProductPreview('');
              setProductFile(null);
            }} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50, background: 'none', border: '1px solid var(--panel-border)', cursor: 'pointer', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              <X size={24} color="var(--text-main)" />
            </button>

            {productSuccess ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', marginTop: '40px' }}>
                <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style={{ color: '#22c55e', marginBottom: '15px', fontSize: '2rem' }}>¡Pedido procesado con éxito!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '30px' }}>Su comprobante está en verificación. Pronto se le confirmará su pedido.</p>
                <button onClick={() => setIsProductCheckoutOpen(false)} className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.1rem' }}>
                  Volver al Catálogo
                </button>
              </div>
            ) : (
              <>
                <h1 className="checkout-modal-title" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '40px', marginTop: '40px', color: 'var(--text-main)' }}>Detalles de la compra</h1>
                
                <form onSubmit={handleProductSubmit} className="checkout-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                  
                  {/* Lado Izquierdo: Detalles de facturación */}
                  <div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-main)' }}>Detalles de facturación</h3>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>DNI *</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" required maxLength="8" style={{ 
                          width: '100%', 
                          padding: '14px 16px', 
                          borderRadius: '10px', 
                          border: productValidationErrors.dni ? '2px solid #dc2626' : productForm.dni.length === 8 ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                          backgroundColor: 'rgba(255,255,255,0.02)', 
                          color: 'var(--text-main)',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease',
                          boxShadow: productValidationErrors.dni ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                        }}
                          value={productForm.dni} onChange={handleProductDniChange} placeholder="Ingrese su DNI de 8 dígitos" />
                        {productForm.dni.length === 8 && !productValidationErrors.dni && (
                          <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                      </div>
                      {productValidationErrors.dni && (
                        <div style={{ 
                          marginTop: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          color: '#ef4444', 
                          fontSize: '0.85rem', 
                          fontWeight: '500', 
                          backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(239, 68, 68, 0.15)'
                        }}>
                          <AlertCircle size={16} />
                          <span>{productValidationErrors.dni}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Nombre Completo *</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" required disabled style={{ 
                          width: '100%', 
                          padding: '14px 16px', 
                          borderRadius: '10px', 
                          border: productValidationErrors.nombreCompleto ? '2px solid #dc2626' : (productForm.nombreCompleto.length > 0 && !productValidationErrors.nombreCompleto) ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          color: 'var(--text-muted)',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease',
                          boxShadow: productValidationErrors.nombreCompleto ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none',
                          cursor: 'not-allowed'
                        }}
                          value={productForm.nombreCompleto} placeholder="Se autocompletará automáticamente" />
                        {productForm.nombreCompleto.length > 0 && !productValidationErrors.nombreCompleto && (
                          <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                      </div>
                      {productValidationErrors.nombreCompleto && (
                        <div style={{ 
                          marginTop: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          color: '#ef4444', 
                          fontSize: '0.85rem', 
                          fontWeight: '500', 
                          backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(239, 68, 68, 0.15)'
                        }}>
                          <AlertCircle size={16} />
                          <span>{productValidationErrors.nombreCompleto}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Teléfono *</label>
                      <div style={{ position: 'relative' }}>
                        <input type="text" required maxLength="9" style={{ 
                          width: '100%', 
                          padding: '14px 16px', 
                          borderRadius: '10px', 
                          border: productValidationErrors.telefono ? '2px solid #dc2626' : productForm.telefono.length === 9 ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                          backgroundColor: 'rgba(255,255,255,0.02)', 
                          color: 'var(--text-main)',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease',
                          boxShadow: productValidationErrors.telefono ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                        }}
                          value={productForm.telefono} onChange={e => {setProductForm({...productForm, telefono: e.target.value.replace(/\D/g, '')}); setProductValidationErrors({...productValidationErrors, telefono: null});}} placeholder="9 dígitos" />
                        {productForm.telefono.length === 9 && !productValidationErrors.telefono && (
                          <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                      </div>
                      {productValidationErrors.telefono && (
                        <div style={{ 
                          marginTop: '8px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          color: '#ef4444', 
                          fontSize: '0.85rem', 
                          fontWeight: '500', 
                          backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(239, 68, 68, 0.15)'
                        }}>
                          <AlertCircle size={16} />
                          <span>{productValidationErrors.telefono}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Dirección de correo electrónico</label>
                      <input type="email" style={{ 
                        width: '100%', 
                        padding: '14px 16px', 
                        borderRadius: '10px', 
                        border: '2px solid var(--panel-border)', 
                        backgroundColor: 'rgba(255,255,255,0.02)', 
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s ease'
                      }}
                        value={productForm.email} onChange={e => setProductForm({...productForm, email: e.target.value})} placeholder="ejemplo@correo.com" />
                    </div>
                  </div>

                  {/* Lado Derecho: Tu Pedido */}
                  <div>
                    <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--panel-border)', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '25px', color: 'var(--text-main)' }}>Tu pedido</h3>
                      
                      {/* Summary Table */}
                      <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        <span>PRODUCTO</span>
                        <span>SUBTOTAL</span>
                      </div>
                      
                      {cart.map(item => (
                        <div key={item.producto.id} style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: 'var(--text-main)' }}>{item.producto.nombre} × {item.cantidad}</p>
                          </div>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>S/ {(item.producto.precio * item.cantidad).toFixed(2)}</span>
                        </div>
                      ))}

                      <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Subtotal</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>S/ {cartTotal.toFixed(2)}</span>
                      </div>

                      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>Total</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
                      </div>

                      {/* Metodos de pago (Yape/Transferencia) */}
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', padding: '20px', borderRadius: '12px' }}>
                        <p style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                          Realiza el pago a nuestras cuentas y adjunta el comprobante para procesar tu pedido.
                        </p>
                        
                        <div style={{ marginBottom: '15px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #6f42c1' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#6f42c1' }}>Yape / Plin</p>
                          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {yapeNumber || '---'} {yapeTitular ? <span style={{fontSize:'0.9rem', color:'var(--text-muted)', fontWeight:'normal'}}>({yapeTitular})</span> : null}
                          </p>
                        </div>

                        <div style={{ marginBottom: '20px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#f59e0b' }}>Cuenta Bancaria</p>
                          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {numeroCuenta || '---'} {cuentaTitular ? <span style={{fontSize:'0.9rem', color:'var(--text-muted)', fontWeight:'normal'}}>({cuentaTitular})</span> : null}
                          </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Número de Operación *</label>
                          <div style={{ position: 'relative' }}>
                            <input type="text" required maxLength="15" style={{ 
                              width: '100%', 
                              padding: '14px 16px', 
                              borderRadius: '10px', 
                              border: productValidationErrors.numeroOperacion ? '2px solid #dc2626' : (productForm.numeroOperacion.length >= 6 && productForm.numeroOperacion.length <= 15) ? '2px solid #16a34a' : '2px solid var(--panel-border)', 
                              backgroundColor: 'rgba(255,255,255,0.02)', 
                              color: 'var(--text-main)',
                              fontSize: '0.95rem',
                              transition: 'all 0.2s ease',
                              boxShadow: productValidationErrors.numeroOperacion ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                            }}
                              value={productForm.numeroOperacion} onChange={e => {setProductForm({...productForm, numeroOperacion: e.target.value.replace(/\D/g, '')}); setProductValidationErrors({...productValidationErrors, numeroOperacion: null});}} placeholder="De 6 a 15 dígitos" />
                            {productForm.numeroOperacion.length >= 6 && productForm.numeroOperacion.length <= 15 && !productValidationErrors.numeroOperacion && (
                              <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            )}
                          </div>
                          {productValidationErrors.numeroOperacion && (
                            <div style={{ 
                              marginTop: '8px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              color: '#ef4444', 
                              fontSize: '0.85rem', 
                              fontWeight: '500', 
                              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(239, 68, 68, 0.15)'
                            }}>
                              <AlertCircle size={16} />
                              <span>{productValidationErrors.numeroOperacion}</span>
                            </div>
                          )}
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.5px' }}>Comprobante de Pago *</label>
                          <div style={{ position: 'relative' }}>
                            <input 
                              key={productFile ? 'has-file' : 'no-file'}
                              type="file" 
                              accept="image/*" 
                              required={!productFile}
                              style={{ 
                                width: '100%', 
                                padding: '14px 16px', 
                                borderRadius: '10px', 
                                border: productValidationErrors.comprobante ? '2px solid #dc2626' : productFile ? '2px solid #16a34a' : '2px dashed var(--panel-border)', 
                                backgroundColor: 'rgba(255,255,255,0.02)', 
                                cursor: 'pointer',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s ease',
                                boxShadow: productValidationErrors.comprobante ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : 'none'
                              }}
                              onChange={e => {
                                const file = e.target.files[0];
                                if (file && !file.type.startsWith('image/')) {
                                  alert('Solo se permiten archivos de imagen (PNG, JPG, JPEG, WEBP, GIF, BMP).');
                                  e.target.value = '';
                                  return;
                                }
                                setProductFile(file);
                                setProductValidationErrors({...productValidationErrors, comprobante: null});
                                if (productPreview) URL.revokeObjectURL(productPreview);
                                if (file && file.type.startsWith('image/')) {
                                  setProductPreview(URL.createObjectURL(file));
                                } else {
                                  setProductPreview('');
                                }
                              }} 
                            />
                            {productFile && !productValidationErrors.comprobante && (
                              <CheckCircle2 size={20} color="#16a34a" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            )}
                          </div>

                          {/* Vista previa de imagen del comprobante */}
                          {productPreview && (
                            <div style={{ 
                              marginTop: '15px', 
                              borderRadius: '12px', 
                              border: '2px solid var(--panel-border)', 
                              padding: '12px', 
                              backgroundColor: 'rgba(255,255,255,0.02)',
                              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center'
                            }}>
                              <p style={{ alignSelf: 'flex-start', margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vista previa del comprobante:</p>
                              <img 
                                src={productPreview} 
                                alt="Vista previa del comprobante" 
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '220px', 
                                  borderRadius: '8px', 
                                  objectFit: 'contain',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
                                }} 
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  setProductFile(null);
                                  if (productPreview) URL.revokeObjectURL(productPreview);
                                  setProductPreview('');
                                }}
                                style={{
                                  marginTop: '10px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              >
                                <Trash2 size={14} /> Quitar imagen
                              </button>
                            </div>
                          )}

                          {/* Vista previa de PDF */}
                          {productFile && !productPreview && (
                            <div style={{ 
                              marginTop: '15px', 
                              borderRadius: '12px', 
                              border: '2px solid var(--panel-border)', 
                              padding: '12px', 
                              backgroundColor: 'rgba(255,255,255,0.02)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Comprobante PDF</p>
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{productFile.name}</p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  setProductFile(null);
                                  if (productPreview) URL.revokeObjectURL(productPreview);
                                  setProductPreview('');
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #fee2e2',
                                  backgroundColor: '#fef2f2',
                                  color: '#ef4444',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              >
                                Quitar
                              </button>
                            </div>
                          )}
                          {productValidationErrors.comprobante && (
                            <div style={{ 
                              marginTop: '8px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              color: '#ef4444', 
                              fontSize: '0.85rem', 
                              fontWeight: '500', 
                              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              border: '1px solid rgba(239, 68, 68, 0.15)'
                            }}>
                              <AlertCircle size={16} />
                              <span>{productValidationErrors.comprobante}</span>
                            </div>
                          )}
                        </div>

                        {productSubmitError && (
                          <div style={{
                            marginBottom: '16px',
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px',
                            color: '#ef4444', 
                            fontSize: '0.95rem', 
                            backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(239, 68, 68, 0.15)'
                          }}>
                            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontWeight: '600' }}>Error al procesar la compra</span>
                              <span style={{ opacity: 0.9 }}>{productSubmitError}</span>
                            </div>
                          </div>
                        )}

                        <button type="submit" disabled={isSubmittingProduct} style={{
                          width: '100%', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none',
                          padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem',
                          cursor: isSubmittingProduct ? 'not-allowed' : 'pointer', opacity: isSubmittingProduct ? 0.7 : 1,
                          transition: 'background-color 0.2s', boxShadow: '0 4px 15px rgba(255, 62, 62, 0.3)'
                        }}>
                          {isSubmittingProduct ? 'Procesando...' : 'Finalizar compra'}
                        </button>
                      </div>
                    </div>
                  </div>

                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CatalogoVirtual;
