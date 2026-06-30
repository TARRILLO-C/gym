import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { uploadImage, deleteImage } from '../services/storage';
import { 
  Package, 
  ShoppingCart, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  ShoppingBag,
  RotateCcw,
  ClipboardList
} from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import Modal from '../components/ui/Modal';
import PrintTicket from '../components/ui/PrintTicket';

const Productos = () => {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' o 'inventario'
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [filterMode, setFilterMode] = useState('ACTIVO');
  
  // Modales globalizados
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const [productForm, setProductForm] = useState({
    nombre: '', precio: '', stock: '', stockMinimo: 5, categoriaId: '', descripcion: '', imagenUrl: '', activo: true
  });

  const [categoryForm, setCategoryForm] = useState({ nombre: '' });
  const [categoriasTodas, setCategoriasTodas] = useState([]);
  const [catInventoryTab, setCatInventoryTab] = useState('productos');

  const [checkoutForm, setCheckoutForm] = useState({
    socioId: '', 
    tipoComprobante: 'BOLETA', 
    clienteNombre: '',
    clienteDocumento: '',
    pagos: [{ metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }]
  });

  const [dialogConfig, setDialogConfig] = useState({ isOpen: false });
  const [lastVentaData, setLastVentaData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(true);

  // Ajuste de Inventario
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productoId: '',
    tipo: 'ENTRADA',
    cantidad: '',
    motivo: '',
    referencia: ''
  });
  const [adjustResult, setAdjustResult] = useState(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Historial de movimientos
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const showAlert = (title, message) => setDialogConfig({ isOpen: true, type: 'alert', title, message });

  const [socioSearch, setSocioSearch] = useState('');
  const [showSocioDropdown, setShowSocioDropdown] = useState(false);
  const role = sessionStorage.getItem('role');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodResp, socioResp, catResp, cajaResp] = await Promise.all([
        api.get('/productos'),
        api.get('/socios'),
        api.get('/categorias-producto'),
        api.get('/sesiones-caja/activa').catch(() => null)
      ]);
      setProductos(prodResp.data);
      setSocios(socioResp.data);
      setCategorias(catResp.data);
      setCajaAbierta(cajaResp && cajaResp.status === 200 && cajaResp.data && (cajaResp.data.estado === 'ABIERTO' || cajaResp.data.estado === 'ABIERTA'));
      if (role === 'ADMINISTRADOR') {
        try {
          const catTodasResp = await api.get('/categorias-producto/todas');
          setCategoriasTodas(catTodasResp.data);
        } catch (e) { setCategoriasTodas([]); }
      }
    } catch (err) { } finally { setLoading(false); }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const nombre = categoryForm.nombre.trim();
    if (!nombre) {
      showAlert("Validación", "El nombre de la categoría es obligatorio.");
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombre)) {
      showAlert("Validación", "El nombre de la categoría solo puede contener letras y espacios.");
      return;
    }
    try {
      if (editingCategory) {
        await api.put(`/categorias-producto/${editingCategory.id}`, { nombre });
      } else {
        await api.post('/categorias-producto', { nombre });
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ nombre: '' });
      await fetchData();
      showAlert("Éxito", editingCategory ? "Categoría actualizada correctamente." : "Categoría creada correctamente.");
    } catch (err) {
      const msg = err.response?.status === 403
        ? "Solo los administradores pueden crear categorías."
        : err.response?.data?.mensaje || "Error al guardar la categoría.";
      showAlert("Error", msg);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    if (parseFloat(productForm.precio) <= 0 || isNaN(parseFloat(productForm.precio))) {
      showAlert("Validación", "El precio del producto debe ser mayor a 0.");
      return;
    }
    if (parseFloat(productForm.precio) > 200) {
      showAlert("Validación", "El precio no puede superar los S/ 200.00.");
      return;
    }
    if (parseInt(productForm.stock) < 0 || isNaN(parseInt(productForm.stock)) || parseInt(productForm.stock) > 99) {
      showAlert("Validación", "El stock inicial debe ser entre 0 y 99.");
      return;
    }
    if (parseInt(productForm.stockMinimo) < 0 || isNaN(parseInt(productForm.stockMinimo))) {
      showAlert("Validación", "El stock mínimo de alerta no puede ser negativo.");
      return;
    }
    if (!productForm.categoriaId) {
      showAlert("Validación", "Debe seleccionar una categoría.");
      return;
    }

    try {
      const payload = {
        ...productForm,
        categoriaId: Number(productForm.categoriaId)
      };
      if (editingProduct) {
        await api.put(`/productos/${editingProduct.id}`, payload);
      } else {
        await api.post('/productos', payload);
      }
      setShowProductModal(false);
      fetchData();
      resetProductForm();
    } catch (err) { showAlert("Error", "Error al guardar producto"); }
  };

  const resetProductForm = () => {
    const defaultCategoriaId = categorias.length > 0 ? String(categorias[0].id) : '';
    setProductForm({ nombre: '', precio: '', stock: '', stockMinimo: 5, categoriaId: defaultCategoriaId, descripcion: '', imagenUrl: '', activo: true });
    setEditingProduct(null);
    setUploading(false);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      // Opcional: Si ya había una imagen y estamos editando o subiendo una nueva, borramos la anterior
      if (productForm.imagenUrl) {
        deleteImage(productForm.imagenUrl);
      }
      setProductForm(prev => ({ ...prev, imagenUrl: url }));
    } catch (err) {
      showAlert("Error", "No se pudo subir la imagen a Appwrite. Verifique la conexión.");
    } finally {
      setUploading(false);
    }
  };


  const handleDeleteProduct = (id) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Eliminar Producto',
      message: '¿Estás seguro de eliminar este producto?',
      onConfirm: async () => {
        try {
          const productToDelete = productos.find(p => p.id === id);
          if (productToDelete && productToDelete.imagenUrl) {
            // deleteImage(productToDelete.imagenUrl); // (Opcional: no borrar imagen si es borrado lógico)
          }
          await api.delete(`/productos/${id}`);
          await fetchData();
        } catch (err) { showAlert("Error", "Error al archivar producto"); }
      }
    });
  };

  const handleRestoreProduct = (product) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Activar Producto',
      message: `¿Estás seguro de reactivar el producto "${product.nombre}"? Volverá a aparecer en el punto de venta.`,
      onConfirm: async () => {
        try {
          await api.put(`/productos/${product.id}`, { ...product, activo: true });
          await fetchData();
        } catch (err) { showAlert("Error", "Error al reactivar producto"); }
      }
    });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (isAdjusting) return;
    if (!adjustForm.productoId) {
      showAlert("Validación", "Debe seleccionar un producto.");
      return;
    }
    const cantidad = parseInt(adjustForm.cantidad);
    if (!cantidad || cantidad <= 0) {
      showAlert("Validación", "La cantidad debe ser mayor a 0.");
      return;
    }
    setIsAdjusting(true);
    try {
      const resp = await api.post('/inventario/ajustes', {
        productoId: Number(adjustForm.productoId),
        tipo: adjustForm.tipo,
        cantidad: cantidad,
        motivo: adjustForm.motivo.trim() || null,
        referencia: adjustForm.referencia.trim() || null
      });
      setAdjustResult(resp.data);
      setShowAdjustModal(false);
      setAdjustForm({ productoId: '', tipo: 'ENTRADA', cantidad: '', motivo: '', referencia: '' });
      await fetchData();
      showAlert(
        "Ajuste Registrado",
        `${resp.data.tipo === 'ENTRADA' ? 'Ingresaron' : resp.data.tipo === 'SALIDA' ? 'Salieron' : 'Se ajustaron a'} ${resp.data.cantidad} unidades de "${resp.data.productoNombre}". Stock: ${resp.data.stockAnterior} → ${resp.data.stockNuevo}`
      );
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.response?.data?.message || "Error al realizar ajuste de inventario";
      showAlert("Error", msg);
    } finally {
      setIsAdjusting(false);
    }
  };

  const openHistory = async () => {
    setShowHistoryModal(true);
    setLoadingMovements(true);
    try {
      const resp = await api.get('/inventario/movimientos');
      setMovements(resp.data);
    } catch (err) {
      showAlert("Error", "No se pudo cargar el historial de movimientos.");
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ nombre: cat.nombre });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (cat) => {
    setDialogConfig({
      isOpen: true, type: 'confirm', title: 'Archivar Categoría',
      message: `¿Estás seguro de archivar la categoría "${cat.nombre}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/categorias-producto/${cat.id}`);
          await fetchData();
        } catch (err) { showAlert("Error", "Error al archivar categoría"); }
      }
    });
  };

  const handleRestoreCategory = async (cat) => {
    try {
      await api.put(`/categorias-producto/${cat.id}`, { nombre: cat.nombre, activo: true });
      await fetchData();
    } catch (err) { showAlert("Error", "Error al restaurar categoría"); }
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
        const nombre = res.data?.nombreCompleto || res.data?.datos?.nombreCompleto;
        if (res.data && nombre) {
          setCheckoutForm(prev => ({...prev, clienteNombre: nombre}));
        }
      } catch (err) { console.error("Error dni:", err); }
      setIsSearchingDoc(false);
    } else if (doc.length === 11 && isFactura) {
      setIsSearchingDoc(true);
      try {
        const res = await api.get(`/consultas/ruc/${doc}`);
        const nombre = res.data?.nombreCompleto || res.data?.datos?.nombreCompleto;
        if (res.data && nombre) {
          setCheckoutForm(prev => ({...prev, clienteNombre: nombre}));
        }
      } catch (err) { console.error("Error ruc:", err); }
      setIsSearchingDoc(false);
    }
  };

  const handleFinalizeSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    // VALIDACIONES SUNAT
    const doc = checkoutForm.clienteDocumento ? checkoutForm.clienteDocumento.trim() : '';
    const nom = checkoutForm.clienteNombre ? checkoutForm.clienteNombre.trim() : '';

    if (checkoutForm.tipoComprobante === 'FACTURA') {
      if (doc.length !== 11 || !/^(10|20)\d{9}$/.test(doc)) {
        showAlert("Error Fiscal (SUNAT)", "El RUC de la factura debe tener 11 dígitos exactos y comenzar con '10' o '20'.");
        setIsSubmitting(false);
        return;
      }
      if (nom === '') {
        showAlert("Error Fiscal (SUNAT)", "La Razón Social es estrictamente obligatoria para emitir Factura.");
        setIsSubmitting(false);
        return;
      }
    } else if (checkoutForm.tipoComprobante === 'BOLETA') {
      if (cartTotal > 700) {
        if (doc.length !== 8 || !/^\d{8}$/.test(doc)) {
          showAlert("Error Fiscal (SUNAT)", "Por normativas SUNAT, las ventas mayores a S/ 700.00 exigen DNI de 8 dígitos obligatoriamente.");
          setIsSubmitting(false);
          return;
        }
        if (nom === '') {
          showAlert("Error Fiscal (SUNAT)", "Al superar S/ 700.00, el nombre completo del cliente es obligatorio.");
          setIsSubmitting(false);
          return;
        }
      } else if (doc.length > 0) {
        if (doc.length !== 8 || !/^\d{8}$/.test(doc)) {
          showAlert("Error de Formato", "Si ingresa un DNI voluntariamente, debe tener exactamente 8 dígitos.");
          setIsSubmitting(false);
          return;
        }
      }
    }

    const sumaPagos = checkoutForm.pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
    if (Math.abs(sumaPagos - cartTotal) > 0.01) {
      showAlert("Atención", "La suma de los pagos (S/ " + sumaPagos.toFixed(2) + ") debe coincidir con el Total a Pagar (S/ " + cartTotal.toFixed(2) + ").");
      setIsSubmitting(false);
      return;
    }

    const metodos = checkoutForm.pagos.map(p => p.metodoPago);
    if (new Set(metodos).size !== metodos.length) {
      const repetido = metodos.filter((item, index) => metodos.indexOf(item) !== index)[0];
      showAlert("Atención", `No puede agregar el mismo método de pago más de una vez. Por favor, sume los montos de ${repetido} en una sola fila.`);
      setIsSubmitting(false);
      return;
    }

    // Las referencias ya no son obligatorias según el usuario.

    try {
      const payload = {
        socioId: checkoutForm.socioId || null,
        tipoComprobante: checkoutForm.tipoComprobante,
        clienteNombre: checkoutForm.clienteNombre,
        clienteDocumento: checkoutForm.clienteDocumento,
        pagos: checkoutForm.pagos.map(p => ({
          metodoPago: p.metodoPago,
          monto: parseFloat(p.monto)
        })),
        detalles: cart.map(item => ({ producto: { id: item.producto.id }, cantidad: item.cantidad }))
      };
      
      const resp = await api.post('/ventas', payload);
      const ventaRealData = resp.data;
      
      setLastVentaData(ventaRealData);
      setCart([]);
      setCheckoutForm({...checkoutForm, pagos: [{ metodoPago: 'EFECTIVO', monto: '', numeroOperacion: '' }], socioId: '', clienteNombre: '', clienteDocumento: ''});
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
    } catch (err) { 
        console.error(err);
        const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Error al procesar la venta";
        showAlert("Error", errMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  const productsForPOS = productos
    .filter(p => p.activo !== false)
    .filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.categoria || '').toLowerCase().includes(search.toLowerCase()));

  const productsForInventory = productos
    .filter(p => {
      if (filterMode === 'ALL') return true; 
      if (filterMode === 'ACTIVO') return p.activo !== false;
      if (filterMode === 'INACTIVO') return p.activo === false;
      return true;
    })
    .filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.categoria || '').toLowerCase().includes(search.toLowerCase()));

  const categoriasForInventory = categoriasTodas
    .filter(cat => {
      if (filterMode === 'ALL') return true;
      if (filterMode === 'ACTIVO') return cat.activo !== false;
      if (filterMode === 'INACTIVO') return cat.activo === false;
      return true;
    })
    .filter(cat => cat.nombre.toLowerCase().includes(search.toLowerCase()));

  const filteredSocios = socios.filter(s => s.nombreCompleto.toLowerCase().includes(socioSearch.toLowerCase()) || s.dni.includes(socioSearch));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .mobile-cart-float-btn {
          position: fixed;
          bottom: 85px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          color: white;
          display: none;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(255, 62, 62, 0.4);
          z-index: 900;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .mobile-cart-float-btn:active {
          transform: scale(0.9);
        }
        .mobile-cart-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ffffff;
          color: var(--accent-primary);
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }
        @media (max-width: 768px) {
          .cart-sidebar-desktop {
            display: none !important;
          }
          .mobile-cart-float-btn {
            display: flex;
          }
        }
      `}</style>
    <PageLayout
      title={<span>Punto de <span className="text-gradient">Venta</span></span>}
      subtitle="Gestiona tu inventario y realiza ventas rápidas."
      actionButton={
        <div className="tab-switcher" style={{ display: 'flex', background: 'var(--panel-bg)', padding: '4px', borderRadius: '14px', border: '1px solid var(--panel-border)' }}>
          <button onClick={() => setActiveTab('pos')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'pos' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'pos' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}>
            <ShoppingBag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Venta
          </button>
          {role === 'ADMINISTRADOR' && (
            <button onClick={() => setActiveTab('inventario')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'inventario' ? 'rgba(255, 62, 62, 0.1)' : 'transparent', color: activeTab === 'inventario' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: '600', cursor: 'pointer', transition: '0.3s' }}>
              <Package size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Inventario
            </button>
          )}
        </div>
      }
    >
      <div className="pos-container" style={{ display: 'flex', gap: '24px', flex: 1 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', background: 'var(--panel-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--panel-border)' }}>
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Buscar por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px', width: '100%', background: 'transparent' }} />
            </div>
            
            {activeTab === 'inventario' && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setFilterMode('ALL')}
                    style={{ padding: '8px 16px', background: filterMode === 'ALL' ? 'var(--panel-border)' : 'transparent', color: 'var(--text-main)', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilterMode('ACTIVO')}
                    style={{ padding: '8px 16px', background: filterMode === 'ACTIVO' ? 'rgba(0, 255, 127, 0.2)' : 'transparent', color: filterMode === 'ACTIVO' ? '#00ff7f' : 'var(--text-main)', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    Activos
                  </button>
                  <button 
                    onClick={() => setFilterMode('INACTIVO')}
                    style={{ padding: '8px 16px', background: filterMode === 'INACTIVO' ? 'rgba(255, 62, 62, 0.2)' : 'transparent', color: filterMode === 'INACTIVO' ? '#ff3e3e' : 'var(--text-main)', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    Inactivos
                  </button>
                </div>

                {role === 'ADMINISTRADOR' && (
                  <button className="btn-primary" onClick={() => { setShowAdjustModal(true); }} style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', display: 'flex', justifyContent: 'center', background: 'var(--accent-secondary)' }}>
                    <ClipboardList size={18} /> AJUSTAR
                  </button>
                )}

                {role === 'ADMINISTRADOR' && (
                  <button className="btn-primary" onClick={openHistory} style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', display: 'flex', justifyContent: 'center', background: 'rgba(255, 165, 0, 0.12)', border: '1px solid rgba(255, 165, 0, 0.3)', color: '#ff8c00' }}>
                    <Search size={18} /> HISTORIAL
                  </button>
                )}

                {role === 'ADMINISTRADOR' && (
                  <button className="btn-primary" onClick={() => { setCategoryForm({ nombre: '' }); setShowCategoryModal(true); }} style={{ flex: '1 1 auto', minWidth: '140px', padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
                    <Plus size={18} /> CATEGORÍA
                  </button>
                )}

                <button className="btn-primary" onClick={() => { resetProductForm(); setShowProductModal(true); }} style={{ flex: '1 1 auto', minWidth: '160px', padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
                  <Plus size={18} /> PRODUCTO
                </button>
              </div>
            )}
          </div>

          {activeTab === 'pos' && !cajaAbierta && (
            <div style={{
              background: 'rgba(255, 62, 62, 0.1)',
              border: '1px solid rgba(255, 62, 62, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              color: '#ff3e3e',
              fontWeight: 'bold',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle size={24} />
              <span>⚠️ La caja del día no ha sido abierta. Debe abrir la caja desde el Monitor de Caja antes de poder registrar ventas.</span>
            </div>
          )}

          {activeTab === 'pos' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {productsForPOS.map(p => (
                <div key={p.id} className="card product-card" style={{ padding: '0', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--panel-border)', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column' }} onClick={() => p.stock > 0 && addToCart(p)}>
                  {/* Contenedor de Imagen */}
                  <div style={{ 
                    height: '180px', 
                    background: 'var(--bg-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative',
                    borderBottom: '1px solid var(--panel-border)',
                    padding: '8px'
                  }}>
                    {p.imagenUrl ? (
                      <img src={p.imagenUrl} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Package size={56} color="var(--text-muted)" opacity={0.5} />
                    )}
                    
                    {/* Badge de Categoría */}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '8px', 
                      left: '8px', 
                      background: 'rgba(255,255,255,0.08)', 
                      backdropFilter: 'blur(8px)', 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.65rem', 
                      fontWeight: '800', 
                      color: 'var(--text-main)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      letterSpacing: '0.5px'
                    }}>
                      {p.categoria}
                    </div>

                    {/* Badge de Stock */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      right: '8px', 
                      background: p.stock === 0 
                        ? '#ff3e3e' 
                        : p.stock < (p.stockMinimo ?? 5) 
                          ? '#f59e0b' 
                          : 'rgba(15, 23, 42, 0.65)', 
                      backdropFilter: 'blur(4px)',
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.65rem', 
                      fontWeight: 'bold', 
                      color: 'white',
                      border: p.stock >= (p.stockMinimo ?? 5) ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'
                    }}>
                      {p.stock === 0 
                        ? 'AGOTADO' 
                        : p.stock < (p.stockMinimo ?? 5) 
                          ? `¡SOLO ${p.stock}!` 
                          : `Stock: ${p.stock}`}
                    </div>
                  </div>

                  {/* Info del Producto */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '4px', lineHeight: '1.3' }}>{p.nombre}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.descripcion || 'Sin descripción'}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-primary)' }}>S/ {p.precio.toFixed(2)}</span>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        background: 'var(--accent-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 10px rgba(255, 62, 62, 0.3)'
                      }}>
                        <Plus size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : role === 'ADMINISTRADOR' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--panel-border)', alignSelf: 'flex-start' }}>
                <button onClick={() => setCatInventoryTab('productos')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: catInventoryTab === 'productos' ? 'var(--panel-border)' : 'transparent', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer' }}>Productos</button>
                <button onClick={() => setCatInventoryTab('categorias')} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: catInventoryTab === 'categorias' ? 'var(--panel-border)' : 'transparent', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer' }}>Categorías</button>
              </div>
              {catInventoryTab === 'productos' ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-bg)', textAlign: 'left' }}>
                        <th style={{ padding: '16px' }}>Producto</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right', padding: '16px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsForInventory.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                          <td data-label="PRODUCTO" style={{ padding: '16px' }}>
                            <div style={{ fontWeight: '600' }}>{p.nombre}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.descripcion || "Sin descripción"}</div>
                          </td>
                          <td data-label="CATEGORÍA"><span className="badge" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>{p.categoria}</span></td>
                          <td data-label="PRECIO" style={{ fontWeight: 'bold' }}>S/ {p.precio.toFixed(2)}</td>
                          <td data-label="STOCK">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.stock < (p.stockMinimo ?? 5) ? '#ff3e3e' : '#00ff7f' }}>
                              {p.stock < (p.stockMinimo ?? 5) && <AlertTriangle size={14} />}
                              {p.stock} unidades
                            </div>
                          </td>
                          <td data-label="ESTADO">
                            <span className={`badge ${p.activo !== false ? 'badge-active' : 'badge-inactive'}`}>
                              {p.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td data-label="ACCIONES" style={{ textAlign: 'right', padding: '16px' }}>
                            {p.activo !== false ? (
                              <>
                                <button onClick={() => { setEditingProduct(p); setProductForm({ ...p, categoriaId: p.categoriaId ? String(p.categoriaId) : '' }); setShowProductModal(true); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }} title="Editar"><Edit2 size={18} /></button>
                                <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff3e3e', cursor: 'pointer' }} title="Archivar"><Trash2 size={18} /></button>
                              </>
                            ) : (
                              <button onClick={() => handleRestoreProduct(p)} style={{ background: 'transparent', border: 'none', color: '#00ff7f', cursor: 'pointer' }} title="Reactivar"><RotateCcw size={18} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel-bg)', textAlign: 'left' }}>
                        <th style={{ padding: '16px' }}>Categoría</th>
                        <th>Estado</th>
                        <th style={{ textAlign: 'right', padding: '16px' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriasForInventory.map(cat => (
                        <tr key={cat.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                          <td data-label="CATEGORÍA" style={{ padding: '16px', fontWeight: '600' }}>{cat.nombre}</td>
                          <td data-label="ESTADO">
                            <span className={`badge ${cat.activo ? 'badge-active' : 'badge-inactive'}`}>
                              {cat.activo ? 'ACTIVA' : 'INACTIVA'}
                            </span>
                          </td>
                          <td data-label="ACCIONES" style={{ textAlign: 'right', padding: '16px' }}>
                            {cat.activo ? (
                              <>
                                <button onClick={() => handleEditCategory(cat)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }} title="Editar"><Edit2 size={18} /></button>
                                <button onClick={() => handleDeleteCategory(cat)} style={{ background: 'transparent', border: 'none', color: '#ff3e3e', cursor: 'pointer' }} title="Archivar"><Trash2 size={18} /></button>
                              </>
                            ) : (
                              <button onClick={() => handleRestoreCategory(cat)} style={{ background: 'transparent', border: 'none', color: '#00ff7f', cursor: 'pointer' }} title="Reactivar"><RotateCcw size={18} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {categoriasForInventory.length === 0 && (
                        <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay categorías registradas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
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
                    <th>Estado</th>
                    <th style={{ textAlign: 'right', padding: '16px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productsForInventory.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td data-label="PRODUCTO" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600' }}>{p.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.descripcion || "Sin descripción"}</div>
                      </td>
                      <td data-label="CATEGORÍA"><span className="badge" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>{p.categoria}</span></td>
                      <td data-label="PRECIO" style={{ fontWeight: 'bold' }}>S/ {p.precio.toFixed(2)}</td>
                      <td data-label="STOCK">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: p.stock < (p.stockMinimo ?? 5) ? '#ff3e3e' : '#00ff7f' }}>
                          {p.stock < (p.stockMinimo ?? 5) && <AlertTriangle size={14} />}
                          {p.stock} unidades
                        </div>
                      </td>
                      <td data-label="ESTADO">
                        <span className={`badge ${p.activo !== false ? 'badge-active' : 'badge-inactive'}`}>
                          {p.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td data-label="ACCIONES" style={{ textAlign: 'right', padding: '16px' }}>
                        {p.activo !== false ? (
                          <>
                            <button onClick={() => { setEditingProduct(p); setProductForm({ ...p, categoriaId: p.categoriaId ? String(p.categoriaId) : '' }); setShowProductModal(true); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }} title="Editar"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteProduct(p.id)} style={{ background: 'transparent', border: 'none', color: '#ff3e3e', cursor: 'pointer' }} title="Archivar"><Trash2 size={18} /></button>
                          </>
                        ) : (
                          <button onClick={() => handleRestoreProduct(p)} style={{ background: 'transparent', border: 'none', color: '#00ff7f', cursor: 'pointer' }} title="Reactivar"><RotateCcw size={18} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {activeTab === 'pos' && (
          <div className="card cart-sidebar cart-sidebar-desktop" style={{ width: '350px', background: 'var(--panel-bg)', display: 'flex', flexDirection: 'column', padding: '20px', border: '1px solid var(--panel-border)' }}>
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
                      <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center', color: 'var(--text-main)' }}>{item.cantidad}</span>
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
              <button className="btn-primary" style={{ width: '100%', padding: '16px' }} disabled={cart.length === 0 || !cajaAbierta} onClick={() => setShowCheckoutModal(true)}>
                {cajaAbierta ? 'FINALIZAR VENTA' : 'CAJA CERRADA'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Carrito Móvil Modal */}
      <Modal isOpen={showMobileCart} onClose={() => setShowMobileCart(false)} title="Tu Carrito de Compras">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '150px' }}>
            {cart.length > 0 ? (
              cart.map(item => (
                <div key={item.producto.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.producto.nombre}</div>
                    <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>S/ {item.subtotal.toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                    <button onClick={() => updateCartQuantity(item.producto.id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>-</button>
                    <span style={{ fontSize: '0.95rem', width: '24px', textAlign: 'center', fontWeight: 'bold' }}>{item.cantidad}</span>
                    <button onClick={() => updateCartQuantity(item.producto.id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>+</button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                El carrito está vacío.
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowMobileCart(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                SEGUIR
              </button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px' }} disabled={cart.length === 0 || !cajaAbierta} onClick={() => { setShowMobileCart(false); setShowCheckoutModal(true); }}>
                {cajaAbierta ? 'COMPRAR' : 'CAJA CERRADA'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Botón flotante para carrito en móvil */}
      {activeTab === 'pos' && cart.length > 0 && (
        <button className="mobile-cart-float-btn" onClick={() => setShowMobileCart(true)}>
          <ShoppingCart size={24} />
          <span className="mobile-cart-badge">{cart.length}</span>
        </button>
      )}

      <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSaveProduct} className="responsive-form-grid">
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nombre del Producto</label>
            <input required type="text" value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')})} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Precio (S/)</label>
            <input required type="text" inputMode="decimal" value={productForm.precio} onChange={e => {
              let val = e.target.value.replace(/[^0-9.]/g, '');
              const parts = val.split('.');
              if (parts.length > 2) return;
              if (parts[1] && parts[1].length > 2) return;
              if (parseFloat(val) > 200) return;
              setProductForm({...productForm, precio: val});
            }} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Stock Inicial</label>
            <input required type="text" inputMode="numeric" maxLength="2" value={productForm.stock} disabled={!!editingProduct} onChange={e => setProductForm({...productForm, stock: e.target.value.replace(/\D/g, '').slice(0, 2)})} style={{ opacity: editingProduct ? 0.5 : 1, cursor: editingProduct ? 'not-allowed' : 'text' }} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Stock Mínimo Alerta</label>
            <input required type="text" inputMode="numeric" maxLength="2" value={productForm.stockMinimo} onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
              if (val !== '' && parseInt(val) > 15) return;
              setProductForm({...productForm, stockMinimo: val});
            }} />
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Categoría</label>
            <select required value={productForm.categoriaId} onChange={e => setProductForm({...productForm, categoriaId: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <option value="">Seleccionar categoría...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
            {categorias.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '6px' }}>
                No hay categorías disponibles. Cree una categoría antes de registrar productos.
              </p>
            )}
          </div>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Estado</label>
            <select value={productForm.activo} onChange={e => setProductForm({...productForm, activo: e.target.value === 'true'})} style={{ width: '100%', padding: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <option value="true">ACTIVO</option>
              <option value="false">INACTIVO</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Imagen del Producto</label>
            <div style={{ 
              marginTop: '8px', 
              padding: '20px', 
              border: '2px dashed var(--panel-border)', 
              borderRadius: '12px', 
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              position: 'relative'
            }}>
              {productForm.imagenUrl ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={productForm.imagenUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }} />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (productForm.imagenUrl) deleteImage(productForm.imagenUrl);
                      setProductForm({...productForm, imagenUrl: ''});
                    }}
                    style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ff3e3e', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Plus size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {uploading ? 'Subiendo imagen...' : 'Seleccionar imagen para Appwrite'}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    disabled={uploading}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                  />
                </div>
              )}
            </div>
            {uploading && (
              <div style={{ width: '100%', height: '2px', background: 'var(--panel-border)', marginTop: '10px', overflow: 'hidden' }}>
                <div className="loading-bar" style={{ width: '50%', height: '100%', background: 'var(--accent-primary)' }}></div>
              </div>
            )}
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

      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ nombre: '' }); }} title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}>
        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nombre de la categoría</label>
            <input
              required
              type="text"
              maxLength={100}
              value={categoryForm.nombre}
              onChange={e => setCategoryForm({ nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '').toUpperCase() })}
              placeholder="Ej: SUPLEMENTO, BEBIDA..."
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ nombre: '' }); }} style={{ flex: 1, padding: '14px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px' }}>{editingCategory ? "GUARDAR CAMBIOS" : "CREAR CATEGORÍA"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAdjustModal} onClose={() => { setShowAdjustModal(false); setAdjustForm({ productoId: '', tipo: 'ENTRADA', cantidad: '', motivo: '', referencia: '' }); }} title="Ajuste de Inventario">
        <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(255, 165, 0, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 165, 0, 0.3)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            <strong>📦 ¿Para qué sirve?</strong> Registra entradas, salidas o ajustes manuales de stock. Cada movimiento queda auditado con motivo y fecha.
          </div>

          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Producto</label>
            <select required value={adjustForm.productoId} onChange={e => setAdjustForm({...adjustForm, productoId: e.target.value})} style={{ width: '100%', padding: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <option value="">Seleccionar producto...</option>
              {productos.filter(p => p.activo !== false).map(p => (
                <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tipo de Movimiento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
              {[
                { id: 'ENTRADA', label: 'Entrada', desc: 'Compra / Ingreso', color: '#00ff7f' },
                { id: 'SALIDA', label: 'Salida', desc: 'Baja / Pérdida', color: '#ff3e3e' },
                { id: 'AJUSTE', label: 'Ajuste', desc: 'Corrección', color: '#f59e0b' }
              ].map(t => (
                <div key={t.id} onClick={() => setAdjustForm({...adjustForm, tipo: t.id})} style={{ padding: '10px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', background: adjustForm.tipo === t.id ? `${t.color}20` : 'var(--panel-bg)', border: adjustForm.tipo === t.id ? `1px solid ${t.color}` : '1px solid var(--panel-border)', color: adjustForm.tipo === t.id ? t.color : 'var(--text-main)' }}>
                  <div style={{ fontSize: '0.9rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {adjustForm.tipo === 'ENTRADA' ? 'Cantidad a Ingresar' : adjustForm.tipo === 'SALIDA' ? 'Cantidad a Retirar' : 'Stock Final (Ajuste Directo)'}
            </label>
            <input required type="text" inputMode="numeric" maxLength="2" value={adjustForm.cantidad} onChange={e => setAdjustForm({...adjustForm, cantidad: e.target.value.replace(/\D/g, '').slice(0, 2)})} placeholder="Ej: 4" />
          </div>

          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Motivo <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Obligatorio - sustento del ajuste)</span></label>
            <textarea required value={adjustForm.motivo} onChange={e => setAdjustForm({...adjustForm, motivo: e.target.value.replace(/[0-9]/g, '')})} placeholder="Ej: Compra especial: proteínas por oferta - Supermercado Metropolitano" style={{ width: '100%', height: '70px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '12px' }}></textarea>
          </div>

          <div>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Referencia <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Opcional - factura, N° pedido, etc.)</span></label>
            <input type="text" value={adjustForm.referencia} onChange={e => setAdjustForm({...adjustForm, referencia: e.target.value})} placeholder="Ej: Factura #001-12345" />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={() => { setShowAdjustModal(false); setAdjustForm({ productoId: '', tipo: 'ENTRADA', cantidad: '', motivo: '', referencia: '' }); }} style={{ flex: 1, padding: '14px', background: 'transparent', color: 'var(--text-main)' }}>CANCELAR</button>
            <button type="submit" className="btn-primary" disabled={isAdjusting} style={{ flex: 1, padding: '14px' }}>{isAdjusting ? 'PROCESANDO...' : 'REGISTRAR AJUSTE'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Historial de Ajustes de Inventario">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--panel-bg)', borderRadius: '8px' }}>
            {movements.length} movimiento{ movements.length !== 1 ? 's' : '' } registrado{ movements.length !== 1 ? 's' : '' }
          </div>
          {loadingMovements ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando movimientos...</div>
          ) : movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ClipboardList size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p>No hay movimientos registrados.</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: '55vh' }}>
              <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--panel-bg)', textAlign: 'left', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 8px' }}>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cant.</th>
                    <th>Stock</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <td data-label="FECHA" style={{ padding: '10px 8px', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                        {new Date(m.fechaCreacion).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td data-label="PRODUCTO" style={{ fontWeight: 600 }}>{m.productoNombre}</td>
                      <td data-label="TIPO">
                        <span style={{
                          padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold',
                          background: m.tipo === 'ENTRADA' ? 'rgba(0,255,127,0.15)' : m.tipo === 'SALIDA' ? 'rgba(255,62,62,0.15)' : 'rgba(245,158,11,0.15)',
                          color: m.tipo === 'ENTRADA' ? '#00ff7f' : m.tipo === 'SALIDA' ? '#ff3e3e' : '#f59e0b'
                        }}>
                          {m.tipo}
                        </span>
                      </td>
                      <td data-label="CANT" style={{ fontWeight: 'bold' }}>{m.cantidad}</td>
                      <td data-label="STOCK" style={{ fontSize: '0.7rem' }}>{m.stockAnterior} → {m.stockNuevo}</td>
                      <td data-label="MOTIVO" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.motivo || ''}>
                        {m.motivo || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} title="Finalizar Transacción">
        <form onSubmit={handleFinalizeSale} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asociar a un Socio (Opcional)</label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar por DNI o Nombre..." 
                value={socioSearch} 
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\\s]/g, '');
                  setSocioSearch(val);
                  setShowSocioDropdown(true);
                  if (val === '') {
                    setCheckoutForm({...checkoutForm, socioId: null, clienteNombre: '', clienteDocumento: ''});
                  }
                }} 
                onFocus={() => setShowSocioDropdown(true)}
                style={{ paddingLeft: '40px' }} 
              />
              {showSocioDropdown && socioSearch && filteredSocios.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '12px', zIndex: 1100, maxHeight: '150px', overflowY: 'auto' }}>
                  {filteredSocios.map(s => (
                    <div key={s.id} onClick={() => { 
                      setCheckoutForm({
                        ...checkoutForm, 
                        socioId: s.id, 
                        clienteNombre: checkoutForm.tipoComprobante === 'FACTURA' ? (s.razonSocial || '') : s.nombreCompleto,
                        clienteDocumento: checkoutForm.tipoComprobante === 'FACTURA' ? (s.ruc || '') : s.dni
                      }); 
                      setSocioSearch(s.nombreCompleto); 
                      setShowSocioDropdown(false);
                    }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}>
                      {s.nombreCompleto} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({s.dni})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Métodos de Pago (Mixto)</label>
              <button type="button" onClick={() => setCheckoutForm({...checkoutForm, pagos: [...checkoutForm.pagos, {metodoPago: 'YAPE_PLIN', monto: '', numeroOperacion: ''}]})} style={{ background: 'var(--accent-primary)', color: 'white', padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                + Agregar Pago
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {checkoutForm.pagos.map((pago, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                  <select 
                    value={pago.metodoPago} 
                    onChange={e => {
                      const newPagos = [...checkoutForm.pagos];
                      newPagos[index].metodoPago = e.target.value;
                      if (e.target.value === 'EFECTIVO') newPagos[index].numeroOperacion = '';
                      setCheckoutForm({...checkoutForm, pagos: newPagos});
                    }} 
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="YAPE_PLIN">Yape / Plin</option>
                  </select>
                  
                  <div style={{ position: 'relative', width: '100px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>S/</span>
                    <input 
                      type="number" step="0.01" min="0" required
                      placeholder="0.00" 
                      value={pago.monto} 
                      onChange={e => {
                        const newPagos = [...checkoutForm.pagos];
                        newPagos[index].monto = e.target.value;
                        setCheckoutForm({...checkoutForm, pagos: newPagos});
                      }} 
                      style={{ width: '100%', padding: '10px 10px 10px 25px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }} 
                    />
                  </div>

                  {/* Referencia removida */}
                  
                  {checkoutForm.pagos.length > 1 && (
                    <button type="button" onClick={() => {
                      const newPagos = checkoutForm.pagos.filter((_, i) => i !== index);
                      setCheckoutForm({...checkoutForm, pagos: newPagos});
                    }} style={{ color: '#ff3e3e', background: 'rgba(255,62,62,0.1)', border: 'none', cursor: 'pointer', fontSize: '1.2rem', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Suma: S/ {(checkoutForm.pagos.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0)).toFixed(2)} / S/ {cartTotal.toFixed(2)}
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
                    let doc = '';
                    let nom = '';
                    if (checkoutForm.socioId) {
                      const s = socios.find(socio => socio.id === checkoutForm.socioId);
                      if (s) {
                        nom = tipo.id === 'FACTURA' ? (s.razonSocial || '') : s.nombreCompleto;
                        doc = tipo.id === 'FACTURA' ? (s.ruc || '') : s.dni;
                      }
                    }
                    setCheckoutForm({
                      ...checkoutForm, 
                      tipoComprobante: tipo.id,
                      clienteDocumento: doc,
                      clienteNombre: nom
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
                    <input required type="text" value={checkoutForm.clienteDocumento} onChange={e => setCheckoutForm({...checkoutForm, clienteDocumento: e.target.value.replace(/\D/g, '')})} onBlur={handleDocumentLookup} maxLength="11" placeholder="Ej: 20601234567" disabled={!!checkoutForm.socioId && !!socios.find(s=>s.id===checkoutForm.socioId)?.ruc} style={{ borderColor: '#3b82f6', width: '100%', opacity: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.ruc) ? 0.6 : 1, cursor: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.ruc) ? 'not-allowed' : 'text' }} />
                    {isSearchingDoc && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#3b82f6' }}>Buscando...</div>}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>Razón Social</label>
                  <input required type="text" value={checkoutForm.clienteNombre} onChange={e => setCheckoutForm({...checkoutForm, clienteNombre: e.target.value.toUpperCase()})} placeholder="Ej: Mi Empresa S.A.C." disabled={!!checkoutForm.socioId && !!socios.find(s=>s.id===checkoutForm.socioId)?.razonSocial} style={{ borderColor: '#3b82f6', width: '100%', opacity: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.razonSocial) ? 0.6 : 1, cursor: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.razonSocial) ? 'not-allowed' : 'text' }} />
                </div>
              </div>
            )}

            {checkoutForm.tipoComprobante === 'BOLETA' && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                {cartTotal > 700 && (
                  <div style={{ color: '#ff3e3e', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px', background: 'rgba(255, 62, 62, 0.1)', padding: '6px', borderRadius: '6px' }}>
                    ⚠️ Venta superior a S/ 700.00. El DNI y Nombre son OBLIGATORIOS (Resolución SUNAT).
                  </div>
                )}
                <label style={{ fontSize: '0.75rem', color: cartTotal > 700 ? '#ff3e3e' : '#3b82f6', fontWeight: 'bold' }}>
                  DNI {cartTotal > 700 ? '(Obligatorio)' : '(Opcional para Boleta)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={checkoutForm.clienteDocumento} onChange={e => setCheckoutForm({...checkoutForm, clienteDocumento: e.target.value.replace(/\D/g, '')})} onBlur={handleDocumentLookup} maxLength="8" placeholder="Ej: 71234567" disabled={!!checkoutForm.socioId && !!socios.find(s=>s.id===checkoutForm.socioId)?.dni} style={{ borderColor: cartTotal > 700 ? '#ff3e3e' : '#3b82f6', width: '100%', opacity: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.dni) ? 0.6 : 1, cursor: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.dni) ? 'not-allowed' : 'text' }} />
                  {isSearchingDoc && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#3b82f6' }}>Buscando...</div>}
                </div>
                <label style={{ fontSize: '0.75rem', color: cartTotal > 700 ? '#ff3e3e' : '#3b82f6', fontWeight: 'bold', marginTop: '8px', display: 'block' }}>
                  Nombre Completo {cartTotal > 700 ? '(Obligatorio)' : ''}
                </label>
                <input type="text" value={checkoutForm.clienteNombre} onChange={e => setCheckoutForm({...checkoutForm, clienteNombre: e.target.value.toUpperCase()})} placeholder={cartTotal > 700 ? "Requerido por SUNAT" : "Público General"} disabled={!!checkoutForm.socioId && !!socios.find(s=>s.id===checkoutForm.socioId)?.nombreCompleto} style={{ borderColor: cartTotal > 700 ? '#ff3e3e' : '#3b82f6', width: '100%', opacity: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.nombreCompleto) ? 0.6 : 1, cursor: (checkoutForm.socioId && socios.find(s=>s.id===checkoutForm.socioId)?.nombreCompleto) ? 'not-allowed' : 'text' }} />
              </div>
            )}



          </div>
          <div style={{ background: 'rgba(255, 62, 62, 0.05)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed rgba(255, 62, 62, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total a Pagar</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-primary)' }}>S/ {cartTotal.toFixed(2)}</div>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={
              isSubmitting ||
              // Validaciones dinámicas que bloquean el botón:
              (checkoutForm.tipoComprobante === 'FACTURA' && (checkoutForm.clienteDocumento.length !== 11 || !checkoutForm.clienteNombre.trim())) ||
              (checkoutForm.tipoComprobante === 'BOLETA' && cartTotal > 700 && (checkoutForm.clienteDocumento.length !== 8 || !checkoutForm.clienteNombre.trim())) ||
              (checkoutForm.tipoComprobante === 'BOLETA' && checkoutForm.clienteDocumento.length > 0 && checkoutForm.clienteDocumento.length !== 8) ||

              cart.length === 0
            }
            style={{ 
              width: '100%', 
              padding: '18px', 
              fontSize: '1.1rem',
              opacity: (
                isSubmitting ||
                (checkoutForm.tipoComprobante === 'FACTURA' && (checkoutForm.clienteDocumento.length !== 11 || !checkoutForm.clienteNombre.trim())) ||
                (checkoutForm.tipoComprobante === 'BOLETA' && cartTotal > 700 && (checkoutForm.clienteDocumento.length !== 8 || !checkoutForm.clienteNombre.trim())) ||
                (checkoutForm.tipoComprobante === 'BOLETA' && checkoutForm.clienteDocumento.length > 0 && checkoutForm.clienteDocumento.length !== 8) ||
                (checkoutForm.metodoPago === 'EFECTIVO' && checkoutForm.montoRecibido !== '' && parseFloat(checkoutForm.montoRecibido) < cartTotal) ||
                (checkoutForm.metodoPago === 'TARJETA' && checkoutForm.numeroTarjeta.length !== 16) ||
                (checkoutForm.metodoPago === 'TRANSFERENCIA' && !checkoutForm.numeroOperacion) ||
                cart.length === 0
              ) ? 0.5 : 1,
              cursor: (
                isSubmitting ||
                (checkoutForm.tipoComprobante === 'FACTURA' && (checkoutForm.clienteDocumento.length !== 11 || !checkoutForm.clienteNombre.trim())) ||
                (checkoutForm.tipoComprobante === 'BOLETA' && cartTotal > 700 && (checkoutForm.clienteDocumento.length !== 8 || !checkoutForm.clienteNombre.trim())) ||
                (checkoutForm.tipoComprobante === 'BOLETA' && checkoutForm.clienteDocumento.length > 0 && checkoutForm.clienteDocumento.length !== 8) ||
                (checkoutForm.metodoPago === 'EFECTIVO' && checkoutForm.montoRecibido !== '' && parseFloat(checkoutForm.montoRecibido) < cartTotal) ||
                (checkoutForm.metodoPago === 'TARJETA' && checkoutForm.numeroTarjeta.length !== 16) ||
                (checkoutForm.metodoPago === 'TRANSFERENCIA' && !checkoutForm.numeroOperacion) ||
                cart.length === 0
              ) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'PROCESANDO...' : 'CONFIRMAR Y PAGAR'}
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
              if(dialogConfig.onConfirm) dialogConfig.onConfirm();
              setDialogConfig({ isOpen: false });
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
