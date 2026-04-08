import React, { useEffect, useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Package,
  Loader2,
  Edit,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import api from '../services/api';

const Socios = () => {
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    dni: '',
    telefono: '',
    fechaNacimiento: '',
    estado: 'ACTIVO'
  });
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  const API_CLOUD_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo2MDMsImV4cCI6MTc2NDY4NDM1N30.nH31PRzhb_PF61yLGccnjkkA1ajNZ8jJAKPVwpHL8tA';

  const fetchSocios = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/socios');
      setSocios(resp.data);
    } catch (err) {
      setSocios([
        { id: 1, nombreCompleto: 'Juan Pérez', dni: '72839401', telefono: '987 654 321', estado: 'ACTIVO' },
        { id: 2, nombreCompleto: 'María García', dni: '71928374', telefono: '912 345 678', estado: 'ACTIVO' },
        { id: 3, nombreCompleto: 'Carlos Ruiz', dni: '73948576', telefono: '923 456 789', estado: 'INACTIVO' },
        { id: 4, nombreCompleto: 'Ana López', dni: '74958671', telefono: '934 567 890', estado: 'ACTIVO' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocios();
  }, []);

  // Autocomplete con API Cloud
  useEffect(() => {
    const lookupDni = async () => {
      if (formData.dni.length === 8) {
        setIsSearchingDni(true);
        try {
          const response = await axios.get(`https://miapi.cloud/v1/dni/${formData.dni}`, {
            headers: { 'Authorization': `Bearer ${API_CLOUD_TOKEN}` }
          });
          
          if (response.data && response.data.success) {
            const datos = response.data.datos || {};
            setFormData(prev => ({
              ...prev,
              nombreCompleto: `${datos.nombres || ''} ${datos.ape_paterno || ''} ${datos.ape_materno || ''}`.trim()
            }));
          } else {
            setFormData(prev => ({ ...prev, nombreCompleto: '' }));
          }
        } catch (err) {
          console.error("Error consultando DNI:", err);
          setFormData(prev => ({ ...prev, nombreCompleto: '' }));
        } finally {
          setIsSearchingDni(false);
        }
      } else if (formData.dni.length > 0 && formData.dni.length < 8) {
        // Opcional: limpiar si el usuario borra dígitos
        // setFormData(prev => ({ ...prev, nombreCompleto: '' }));
      }
    };
    lookupDni();
  }, [formData.dni]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/socios', formData);
      setShowModal(false);
      fetchSocios();
      setFormData({
        nombreCompleto: '',
        dni: '',
        telefono: '',
        fechaNacimiento: '',
        estado: 'ACTIVO'
      });
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al registrar socio');
    }
  };

  const filteredSocios = (Array.isArray(socios) ? socios : []).filter(s => {
    if (!s) return false;
    const nombre = s.nombreCompleto || '';
    const dni = s.dni || '';
    return nombre.toLowerCase().includes(search.toLowerCase()) || dni.includes(search);
  });

  const duplicateSocio = (socios || []).find(s => s?.dni === formData.dni);
  const isDniDuplicate = !!duplicateSocio;

  return (
    <div className="socios-view" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Gestión de <span className="text-gradient">Socios</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>Lista de todos los miembros registrados en el sistema.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={20} /> NUEVO SOCIO
        </button>
      </header>

      <section className="card" style={{ padding: '0 24px 24px' }}>
        <div style={{ padding: '24px 0', position: 'relative' }}>
          <Search 
            size={18} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input 
            type="text" 
            placeholder="Buscar por nombre o DNI..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', width: '300px' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando socios...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SOCIO</th>
                <th>DNI</th>
                <th>TELÉFONO</th>
                <th>ESTADO</th>
                <th style={{ textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {(filteredSocios || []).map(socio => (
                <tr key={socio?.id || Math.random()}>
                  <td style={{ fontWeight: '600' }}>{socio?.nombreCompleto || 'Sin nombre'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{socio?.dni || 'N/A'}</td>
                  <td>{socio?.telefono || 'Sin datos'}</td>
                  <td>
                    <span className={`badge ${socio?.estado === 'ACTIVO' ? 'badge-active' : 'badge-inactive'}`}>
                      {socio?.estado || 'DESCONOCIDO'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button style={{ background: 'transparent', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(0,0,0,0.8)', 
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="card" style={{ width: '500px', background: 'var(--bg-color)' }}>
            <h3 style={{ marginBottom: '24px' }}>Registrar Socio</h3>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Nombre Completo</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nombreCompleto}
                  onChange={e => setFormData({...formData, nombreCompleto: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>DNI</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      required 
                      type="text" 
                      maxLength="8"
                      value={formData.dni} 
                      onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})} 
                      placeholder="8 dígitos"
                      style={{ border: isDniDuplicate ? '1px solid #ff3e3e' : '1px solid var(--panel-border)' }}
                    />
                    {isSearchingDni && (
                      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--accent-primary)' }}>Consultando...</div>
                    )}
                  </div>
                  {isDniDuplicate && (
                    <div style={{ color: '#ff3e3e', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> Este DNI ya pertenece a <strong>{duplicateSocio.nombreCompleto}</strong>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Teléfono</label>
                  <input 
                    type="text" 
                    value={formData.telefono}
                    onChange={e => setFormData({...formData, telefono: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={formData.fechaNacimiento}
                  onChange={e => setFormData({...formData, fechaNacimiento: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'white' }}>CANCELAR</button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isDniDuplicate}
                  style={{ flex: 1, opacity: isDniDuplicate ? 0.5 : 1, cursor: isDniDuplicate ? 'not-allowed' : 'pointer' }}
                >
                  REGISTRAR SOCIO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Socios;
