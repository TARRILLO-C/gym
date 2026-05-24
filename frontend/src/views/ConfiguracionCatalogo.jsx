import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Plus, Trash2, ExternalLink } from 'lucide-react';

const ConfiguracionCatalogo = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sliders, setSliders] = useState([]);
  const [membresias, setMembresias] = useState([]);
  
  // States for new slider
  const [newSlider, setNewSlider] = useState({
    imagenUrl: '',
    titulo: '',
    descripcion: '',
    enlaceUrl: '',
    textoBoton: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [sliderFile, setSliderFile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    fetchConfig();
    fetchSliders();
    fetchMembresias();
  }, []);

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

  const fetchMembresias = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/membresias');
      if (response.ok) {
        const data = await response.json();
        setMembresias(data.filter(m => m.estado === 'DISPONIBLE'));
      }
    } catch (error) {
      console.error('Error fetching membresias:', error);
    }
  };

  const handleUploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    return null;
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    let currentLogoUrl = logoUrl;
    
    if (logoFile) {
      const uploadedUrl = await handleUploadImage(logoFile);
      if (uploadedUrl) {
        currentLogoUrl = uploadedUrl;
      }
    }
    
    try {
      const response = await fetch('http://localhost:8080/api/web-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logoUrl: currentLogoUrl,
          whatsappNumber: whatsappNumber
        }),
      });
      if (response.ok) {
        setLogoUrl(currentLogoUrl);
        setLogoFile(null);
        showToast('Configuración general actualizada correctamente');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showToast('Error al actualizar configuración', 'error');
    }
    setLoading(false);
  };

  const handleAddSlider = async () => {
    if (!sliderFile) {
      showToast('Por favor selecciona una imagen para el slider.', 'error');
      return;
    }
    
    setLoading(true);
    const uploadedUrl = await handleUploadImage(sliderFile);
    
    if (uploadedUrl) {
      const sliderData = { ...newSlider, imagenUrl: uploadedUrl };
      
      try {
        const response = await fetch('http://localhost:8080/api/web-config/slider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sliderData),
        });
        
        if (response.ok) {
          const addedSlider = await response.json();
          setSliders([...sliders, addedSlider]);
          setNewSlider({ titulo: '', descripcion: '', enlaceUrl: '', textoBoton: '' });
          setSliderFile(null);
          showToast('Imagen añadida al slider');
        }
      } catch (error) {
        console.error('Error adding slider:', error);
      }
    }
    setLoading(false);
  };

  const requestDeleteSlider = (id) => {
    setConfirmDelete({ show: true, id });
  };

  const executeDeleteSlider = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ show: false, id: null });
    if (!id) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/web-config/slider/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSliders(sliders.filter(s => s.id !== id));
        showToast('Imagen eliminada correctamente');
      }
    } catch (error) {
      console.error('Error deleting slider:', error);
      showToast('Error al eliminar imagen', 'error');
    }
  };

  const handleUpdateMembresiaImage = async (membresiaId, file) => {
    if (!file) return;
    setLoading(true);
    const uploadedUrl = await handleUploadImage(file);
    if (uploadedUrl) {
      try {
        const membresiaToUpdate = membresias.find(m => m.id === membresiaId);
        const response = await fetch(`http://localhost:8080/api/membresias/${membresiaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...membresiaToUpdate, imagenUrl: uploadedUrl }),
        });
        if (response.ok) {
          const updated = await response.json();
          setMembresias(membresias.map(m => m.id === membresiaId ? updated : m));
          showToast('Imagen del plan actualizada');
        }
      } catch (error) {
        console.error('Error updating membresia image:', error);
        showToast('Error al actualizar imagen', 'error');
      }
    }
    setLoading(false);
  };

  const handleToggleMostrarCatalogo = async (membresiaId, currentState) => {
    setLoading(true);
    try {
      const membresiaToUpdate = membresias.find(m => m.id === membresiaId);
      const response = await fetch(`http://localhost:8080/api/membresias/${membresiaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...membresiaToUpdate, mostrarEnCatalogo: !currentState }),
      });
      if (response.ok) {
        const updated = await response.json();
        setMembresias(membresias.map(m => m.id === membresiaId ? updated : m));
        showToast(updated.mostrarEnCatalogo ? 'Plan añadido al catálogo' : 'Plan ocultado del catálogo');
      }
    } catch (error) {
      console.error('Error toggling mostrarEnCatalogo:', error);
      showToast('Error al actualizar visibilidad', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="view-container">
      <div className="header-actions">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configuración del Catálogo Virtual</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Sección de Configuración General */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Configuración General
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Logo Actual</p>
            <div style={{ 
              width: '100px', height: '100px', 
              border: '2px dashed var(--border-color)', 
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              overflow: 'hidden'
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo actual" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <ImageIcon size={40} color="var(--text-muted)" />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Cambiar Logo</p>
            <input 
              type="file" 
              accept="image/*"
              className="form-control"
              onChange={(e) => setLogoFile(e.target.files[0])}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Número de WhatsApp (Ej: 51987654321)</p>
            <input 
              type="text" 
              className="form-control"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Número de WhatsApp para recibir pedidos"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              className="btn-primary" 
              onClick={handleSaveConfig}
              disabled={loading}
            >
              {loading ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
            </button>
            <button 
              className="btn-secondary"
              onClick={() => window.open('/catalogo', '_blank')}
            >
              VISITAR PÁGINA
            </button>
          </div>
        </div>

        {/* Sección de Planes / Membresías */}
        <div className="card glass" style={{ padding: '20px', gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Configuración de Imágenes de Planes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {membresias.map(plan => (
              <div key={plan.id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{plan.nombre}</h3>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '5px' }}>
                    <input 
                      type="checkbox" 
                      checked={plan.mostrarEnCatalogo || false}
                      onChange={() => handleToggleMostrarCatalogo(plan.id, plan.mostrarEnCatalogo)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mostrar</span>
                  </label>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>S/ {plan.precio.toFixed(2)} - {plan.duracionDias} días</p>
                <div style={{
                  width: '100%', height: '180px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)'
                }}>
                  {plan.imagenUrl ? (
                    <img src={plan.imagenUrl} alt={plan.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={40} color="#cbd5e1" />
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>Actualizar Imagen</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '5px' }}
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleUpdateMembresiaImage(plan.id, e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
            {membresias.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No hay planes disponibles.</p>
            )}
          </div>
        </div>

        {/* Sección del Slider */}
        <div className="card glass" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Slider de la Página Principal
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label>Archivo de Imagen</label>
              <input 
                type="file" 
                accept="image/*"
                className="form-control"
                onChange={(e) => setSliderFile(e.target.files[0])}
              />
            </div>
            
            <div>
              <label>Título</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej: Gran Descuento"
                value={newSlider.titulo}
                onChange={(e) => setNewSlider({...newSlider, titulo: e.target.value})}
              />
            </div>

            <div>
              <label>Descripción</label>
              <textarea 
                className="form-control" 
                placeholder="Ej: 48 horas de descuento en productos seleccionados."
                rows="2"
                value={newSlider.descripcion}
                onChange={(e) => setNewSlider({...newSlider, descripcion: e.target.value})}
              />
            </div>

            <div>
              <label>Enlace (URL)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej: /catalogo o https://..."
                value={newSlider.enlaceUrl}
                onChange={(e) => setNewSlider({...newSlider, enlaceUrl: e.target.value})}
              />
            </div>

            <div>
              <label>Texto del Botón</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej: Comprar ahora"
                value={newSlider.textoBoton}
                onChange={(e) => setNewSlider({...newSlider, textoBoton: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
            <button 
              className="btn-primary" 
              onClick={handleAddSlider}
              disabled={loading}
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? 'AÑADIENDO...' : 'AÑADIR IMAGEN AL SLIDER'}
            </button>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Imágenes Actuales del Slider</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            {sliders.map(slider => (
              <div key={slider.id} style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                <div style={{ height: '120px', width: '100%', overflow: 'hidden' }}>
                  <img src={slider.imagenUrl} alt={slider.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: '0 0 5px 0' }}>{slider.titulo || 'Sin título'}</p>
                  <button 
                    onClick={() => requestDeleteSlider(slider.id)}
                    style={{ 
                      width: '100%', padding: '5px', 
                      backgroundColor: '#ef4444', color: 'white', 
                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                    }}
                  >
                    <Trash2 size={16} /> ELIMINAR
                  </button>
                </div>
              </div>
            ))}
            
            {sliders.length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1' }}>No hay imágenes en el slider actualmente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        fontWeight: 'bold',
        zIndex: 9999,
        transform: toast.show ? 'translateY(0)' : 'translateY(100px)',
        opacity: toast.show ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDelete.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: 'var(--panel-bg)',
            padding: '30px', borderRadius: '20px',
            width: '90%', maxWidth: '400px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
            textAlign: 'center',
            border: '1px solid var(--panel-border)'
          }}>
            <Trash2 size={50} color="#ef4444" style={{ marginBottom: '15px' }} />
            <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '1.5rem' }}>¿Eliminar Imagen?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Esta acción no se puede deshacer. La imagen desaparecerá permanentemente del slider del catálogo público.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmDelete({ show: false, id: null })}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  border: '1px solid var(--panel-border)', background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold',
                  flex: 1, transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'var(--panel-border)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'var(--bg-secondary)'}
              >
                CANCELAR
              </button>
              <button 
                onClick={executeDeleteSlider}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  border: 'none', backgroundColor: '#ef4444',
                  color: 'white', cursor: 'pointer', fontWeight: 'bold',
                  flex: 1, transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 15px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 10px rgba(239, 68, 68, 0.3)';
                }}
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionCatalogo;
