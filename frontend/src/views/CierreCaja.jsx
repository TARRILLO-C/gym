import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Plus, X, Lock, RefreshCw, DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, ShieldAlert, Banknote } from 'lucide-react';
import api from '../services/api';

const CierreCaja = ({ isOpen, onClose }) => {
    // ── ESTADOS DE SESIÓN ──
    const [sesionActiva, setSesionActiva] = useState(null);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── ESTADOS FORMULARIOS ──
    // Apertura
    const [montoInicial, setMontoInicial] = useState('');
    const [turnoSeleccionado, setTurnoSeleccionado] = useState('Mañana');
    const [observacionesApertura, setObservacionesApertura] = useState('');
    
    // Cierre (Ciego)
    const [montoFisicoCajero, setMontoFisicoCajero] = useState('');
    const [fondoParaSiguiente, setFondoParaSiguiente] = useState('');
    const [observacionesCierre, setObservacionesCierre] = useState('');
    const [resultadoCierre, setResultadoCierre] = useState(null); // Almacena el resultado tras cerrar

    // Movimientos (Egresos/Retiros)
    const [movimientoTipo, setMovimientoTipo] = useState('EGRESO');
    const [movimientoMonto, setMovimientoMonto] = useState('');
    const [movimientoDesc, setMovimientoDesc] = useState('');
    const [pinAdmin, setPinAdmin] = useState('');
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [abriendo, setAbriendo] = useState(false);
    const [registrando, setRegistrando] = useState(false);
    const [ahora, setAhora] = useState(new Date());

    useEffect(() => { const t = setInterval(() => setAhora(new Date()), 1000); return () => clearInterval(t); }, []);

    // Toast state
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    // Helper to block negative, plus, and exponent keys
    const handleKeyPress = (e) => {
        if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
            e.preventDefault();
        }
    };

    // Helper to validate onChange values (allow empty, dot, and positive numbers only)
    const handleNumberChange = (setter) => (e) => {
        const val = e.target.value;
        if (val === '' || val === '.' || parseFloat(val) >= 0) {
            setter(val);
        }
    };

    useEffect(() => {
        if (isOpen) {
            verificarSesionActiva();
            setResultadoCierre(null);
        }
    }, [isOpen]);

    // ── API: VERIFICAR SESIÓN ──
    const verificarSesionActiva = async () => {
        setLoading(true);
        try {
            // 1. Ver si hay sesión abierta
            const resActiva = await api.get('/sesiones-caja/activa');
            
            if (resActiva.status === 200 && resActiva.data) {
                setSesionActiva(resActiva.data);
                // 2. Traer el resumen financiero (que NO incluye montoEsperadoEfectivo por seguridad)
                const resResumen = await api.get('/sesiones-caja/activa/resumen');
                setResumen(resResumen.data);
            } else {
                // 3. No hay sesión. Sugerir fondo basado en la última cerrada
                setSesionActiva(null);
                const resUltima = await api.get('/sesiones-caja/ultima-cerrada');
                if (resUltima.data?.fondoParaSiguiente) {
                    setMontoInicial(resUltima.data.fondoParaSiguiente.toString());
                } else {
                    setMontoInicial('0.00');
                }
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            showToast('Error de conexión al verificar el estado de la caja.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ── API: ABRIR CAJA ──
    const handleAbrirCaja = async (e) => {
        e.preventDefault();
        if (!montoInicial) { showToast('Ingrese el fondo inicial.', 'error'); return; }
        const parsedMonto = parseFloat(montoInicial);
        if (isNaN(parsedMonto) || parsedMonto < 0) { showToast('El monto debe ser positivo.', 'error'); return; }
        setAbriendo(true);
        try {
            const username = localStorage.getItem('username') || 'Cajero';
            await api.post('/sesiones-caja/abrir', { username, turno: turnoSeleccionado, montoInicial: parsedMonto, observaciones: observacionesApertura });
            showToast('¡Turno abierto exitosamente!', 'success');
            verificarSesionActiva();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al abrir caja', 'error');
        } finally { setAbriendo(false); }
    };

    // ── API: CERRAR CAJA (CIEGO) ──
    const confirmarCierre = (e) => {
        e.preventDefault();
        if (montoFisicoCajero === '') { showToast('Ingrese el efectivo contado en gaveta.', 'error'); return; }
        if (fondoParaSiguiente === '') { showToast('Ingrese el fondo para el siguiente turno.', 'error'); return; }
        const f = parseFloat(montoFisicoCajero), s = parseFloat(fondoParaSiguiente);
        if (isNaN(f) || f < 0) { showToast('El monto físico debe ser positivo.', 'error'); return; }
        if (isNaN(s) || s < 0) { showToast('El fondo debe ser positivo.', 'error'); return; }
        setConfirmModalOpen(true);
    };

    const handleCerrarCaja = async () => {
        setConfirmModalOpen(false);
        setCerrando(true);
        try {
            const res = await api.post('/sesiones-caja/cerrar', {
                sesionId: sesionActiva.id,
                montoFinalReal: parseFloat(montoFisicoCajero),
                fondoParaSiguiente: parseFloat(fondoParaSiguiente),
                observaciones: observacionesCierre
            });
            setResultadoCierre(res.data);
            setSesionActiva(null);
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al cerrar caja', 'error');
        } finally { setCerrando(false); }
    };

    // ── API: REGISTRAR MOVIMIENTO ──
    const handleRegistrarMovimiento = async (e) => {
        e.preventDefault();
        if (!movimientoDesc.trim() || !movimientoMonto) { showToast('Complete el motivo y el monto.', 'error'); return; }
        const parsed = parseFloat(movimientoMonto);
        if (isNaN(parsed) || parsed <= 0) { showToast('El monto debe ser mayor a cero.', 'error'); return; }
        if (movimientoTipo === 'RETIRO_FONDOS' && !pinAdmin) { showToast('El PIN de administrador es obligatorio.', 'error'); return; }
        setRegistrando(true);
        try {
            const username = localStorage.getItem('username') || 'Cajero';
            const endpoint = movimientoTipo === 'EGRESO' ? '/sesiones-caja/egresos' : '/sesiones-caja/retiros';
            const payload = { descripcion: movimientoDesc.trim(), monto: parsed, username, ...(movimientoTipo === 'RETIRO_FONDOS' && { pinAdmin }) };
            await api.post(endpoint, payload);
            showToast('Movimiento registrado.', 'success');
            setMovimientoMonto(''); setMovimientoDesc(''); setPinAdmin('');
            verificarSesionActiva();
        } catch (err) {
            showToast(err.response?.status === 403 ? 'PIN incorrecto.' : err.response?.data?.error || 'Error.', 'error');
        } finally { setRegistrando(false); }
    };

    // Estilos compartidos de UI
    const modalStyle = {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
        backdropFilter: 'blur(8px)'
    };
    const modalContent = {
        background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '16px',
        width: '100%', maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', padding: '30px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.7)', position: 'relative'
    };
    const inputStyle = {
        width: '100%', padding: '14px 18px', marginBottom: '16px', borderRadius: '10px',
        border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
        fontSize: '1rem', transition: 'border-color 0.3s'
    };
    const btnStyle = {
        width: '100%', padding: '16px', background: 'var(--accent-secondary)', color: '#fff',
        border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
        transition: 'transform 0.2s, filter 0.2s', marginTop: '10px'
    };
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px',
        border: '1px solid var(--panel-border)', marginBottom: '24px'
    };

    if (!isOpen) return null;

    return (
        <div style={modalStyle}>
            <div style={modalContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>Control de Caja</h2>
                        <p style={{ color: 'var(--accent-secondary)', margin: 0, marginTop: '8px', fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: sesionActiva ? '#10b981' : '#ef4444', boxShadow: sesionActiva ? '0 0 10px #10b981' : 'none' }}></span>
                            {sesionActiva ? `Sesión Activa: Turno ${sesionActiva.turno}` : 'Caja Cerrada / Sin Sesión'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>{ahora.toLocaleTimeString('es-PE')}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ahora.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '50%', padding: '10px', display: 'flex', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-main)' }}>
                        <RefreshCw className="animate-spin" size={48} style={{ margin: '0 auto', color: 'var(--accent-secondary)' }} />
                        <p style={{ marginTop: '16px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Cargando estado de la caja...</p>
                    </div>
                ) : resultadoCierre ? (
                    <div style={{ textAlign: 'center', ...cardStyle, maxWidth: '500px', margin: '0 auto' }}>
                        <CheckCircle size={70} color="#4ade80" style={{ margin: '0 auto 20px' }} />
                        <h3 style={{ fontSize: '2rem', color: 'var(--text-main)', margin: '0 0 15px 0' }}>¡Turno Cerrado!</h3>
                        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '25px', borderRadius: '12px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Estado:</span>
                                <strong style={{ color: resultadoCierre.estado === 'CUADRADA' ? '#4ade80' : resultadoCierre.estado === 'FALTANTE' ? 'var(--accent-primary)' : '#60a5fa' }}>{resultadoCierre.estado}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Declarado:</span>
                                <strong>S/ {parseFloat(resultadoCierre.montoFinalReal || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.1rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Esperado:</span>
                                <strong>S/ {parseFloat(resultadoCierre.montoFinalEsperado || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--panel-border)', fontSize: '1.2rem' }}>
                                <strong>Diferencia:</strong>
                                <strong style={{ color: resultadoCierre.diferencia < 0 ? 'var(--accent-primary)' : 'var(--text-main)' }}>S/ {parseFloat(resultadoCierre.diferencia || 0).toFixed(2)}</strong>
                            </div>
                        </div>
                        <button onClick={onClose} style={{...btnStyle, background: 'var(--text-main)', color: 'var(--bg-color)'}}>Volver al Dashboard</button>
                    </div>
                ) : !sesionActiva ? (
                    <div style={{ maxWidth: '450px', margin: '30px auto' }}>
                        <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.01)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Clock size={22} color="var(--accent-secondary)" /> Apertura de Turno
                            </h3>
                            <form onSubmit={handleAbrirCaja}>
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Seleccione Turno *</label>
                                <select style={inputStyle} value={turnoSeleccionado} onChange={e => setTurnoSeleccionado(e.target.value)} disabled={abriendo}>
                                    <option value="Mañana">Turno Mañana</option>
                                    <option value="Tarde">Turno Tarde</option>
                                    <option value="Noche">Turno Noche</option>
                                    <option value="General">Turno Completo / General</option>
                                </select>
                                
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Fondo Inicial en Efectivo *</label>
                                <div style={{ position: 'relative', marginBottom: '16px' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold' }}>S/</span>
                                    <input type="number" step="0.01" min="0" style={{...inputStyle, paddingLeft: '34px', fontSize: '1.15rem', fontWeight: 'bold', marginBottom: 0}} value={montoInicial} onKeyDown={handleKeyPress} onChange={handleNumberChange(setMontoInicial)} disabled={abriendo} />
                                </div>
                                
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Observaciones de Apertura (Opcional)</label>
                                <textarea rows="2" style={{...inputStyle, resize: 'none', marginBottom: '20px'}} value={observacionesApertura} onChange={e => setObservacionesApertura(e.target.value)} placeholder="Ej: La caja inicia con sencillo para vueltos..." disabled={abriendo} />
                                
                                <button type="submit" disabled={abriendo} style={{...btnStyle, background: 'var(--accent-secondary)', opacity: abriendo ? 0.7 : 1, cursor: abriendo ? 'not-allowed' : 'pointer'}}>
                                    {abriendo ? 'Abriendo Turno...' : 'Abrir Caja y Registrar Apertura'}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.01)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <h3 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Banknote size={20} color="var(--accent-secondary)" /> Resumen de Flujos
                                </h3>
                                {resumen && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                                <DollarSign size={16} /> <span>Fondo Inicial:</span>
                                            </div>
                                            <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>S/ {parseFloat(resumen.montoInicial || 0).toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', padding: '10px 14px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.95rem' }}>
                                                <TrendingUp size={16} /> <span>Ingresos Totales:</span>
                                            </div>
                                            <strong style={{ color: '#10b981', fontSize: '1rem' }}>+ S/ {parseFloat(resumen.totalIngresos || 0).toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.95rem' }}>
                                                <TrendingDown size={16} /> <span>Movimientos (Egresos/Retiros):</span>
                                            </div>
                                            <strong style={{ color: '#ef4444', fontSize: '1rem' }}>- S/ {parseFloat(resumen.totalMovimientos || 0).toFixed(2)}</strong>
                                        </div>
                                        
                                        <div style={{ marginTop: '10px', paddingTop: '15px', borderTop: '1px dashed var(--panel-border)' }}>
                                            <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Distribución de Ingresos</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {Object.entries(resumen.detalle || {}).map(([m, val]) => (
                                                    <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', padding: '4px 0' }}>
                                                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{String(m).replace('_', ' ').toLowerCase()}</span>
                                                        <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(val || 0).toFixed(2)}</strong>
                                                    </div>
                                                ))}
                                                {Object.keys(resumen.detalle || {}).length === 0 && (
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin ingresos registrados en este turno</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.01)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <h3 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ArrowRightLeft size={20} color="var(--accent-secondary)" /> Movimiento de Salida
                                </h3>
                                <form onSubmit={handleRegistrarMovimiento}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                                        <button type="button" onClick={() => setMovimientoTipo('EGRESO')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: movimientoTipo === 'EGRESO' ? 'rgba(255, 138, 0, 0.1)' : 'transparent', color: movimientoTipo === 'EGRESO' ? 'var(--accent-secondary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s' }}>
                                            Egreso (Gasto)
                                        </button>
                                        <button type="button" onClick={() => setMovimientoTipo('RETIRO_FONDOS')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: movimientoTipo === 'RETIRO_FONDOS' ? 'rgba(59,130,246,0.12)' : 'transparent', color: movimientoTipo === 'RETIRO_FONDOS' ? '#3b82f6' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.88rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Lock size={14} /> Retiro (Admin)
                                        </button>
                                    </div>
                                    
                                    <input type="text" placeholder="Concepto (ej: Pago de luz, limpieza...)" style={{ ...inputStyle, marginBottom: '12px' }} value={movimientoDesc} onChange={e => setMovimientoDesc(e.target.value)} disabled={registrando} />
                                    
                                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '600' }}>S/</span>
                                        <input type="number" step="0.01" min="0.01" placeholder="Monto" style={{ ...inputStyle, paddingLeft: '34px', marginBottom: 0 }} value={movimientoMonto} onKeyDown={handleKeyPress} onChange={handleNumberChange(setMovimientoMonto)} disabled={registrando} />
                                    </div>
                                    
                                    {movimientoTipo === 'RETIRO_FONDOS' && (
                                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                                            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6' }} />
                                            <input type="password" placeholder="PIN de Administrador" style={{ ...inputStyle, paddingLeft: '38px', borderColor: '#3b82f6', background: 'rgba(59,130,246,0.02)', marginBottom: 0 }} value={pinAdmin} onChange={e => setPinAdmin(e.target.value)} disabled={registrando} />
                                        </div>
                                    )}
                                    
                                    <button type="submit" disabled={registrando} style={{ ...btnStyle, background: movimientoTipo === 'RETIRO_FONDOS' ? '#3b82f6' : 'var(--accent-secondary)', opacity: registrando ? 0.7 : 1, cursor: registrando ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
                                        {registrando ? 'Registrando...' : (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <Plus size={18} /> Registrar {movimientoTipo === 'EGRESO' ? 'Egreso' : 'Retiro'}
                                            </span>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div style={{ ...cardStyle, border: '1px solid rgba(255, 138, 0, 0.3)', background: 'linear-gradient(135deg, rgba(255, 138, 0, 0.04) 0%, rgba(255, 138, 0, 0.01) 100%)', boxShadow: '0 8px 32px rgba(255, 138, 0, 0.03)' }}>
                            <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '8px', fontSize: '1.35rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldAlert size={20} /> Cierre de Turno (Ciego)
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.4' }}>
                                Declare el efectivo en caja para cerrar su turno. El sistema realizará el cuadre ciego automáticamente.
                            </p>

                            <form onSubmit={confirmarCierre} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--panel-border)', padding: '18px', borderRadius: '12px', marginBottom: '16px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)', fontSize: '0.98rem', fontWeight: '600' }}>
                                        Total EFECTIVO físico en gaveta:
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-secondary)', fontSize: '1.6rem', fontWeight: 'bold' }}>S/</span>
                                        <input type="number" step="0.01" min="0" style={{...inputStyle, paddingLeft: '45px', fontSize: '1.8rem', fontWeight: '800', background: 'transparent', border: 'none', marginBottom: 0, height: '60px', color: 'var(--text-main)'}} placeholder="0.00" value={montoFisicoCajero} onKeyDown={handleKeyPress} onChange={handleNumberChange(setMontoFisicoCajero)} disabled={cerrando} />
                                    </div>
                                </div>

                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Fondo para el siguiente turno (Sencillo):</label>
                                <input type="number" step="0.01" min="0" style={{ ...inputStyle, marginBottom: '14px' }} placeholder="S/ 0.00" value={fondoParaSiguiente} onKeyDown={handleKeyPress} onChange={handleNumberChange(setFondoParaSiguiente)} disabled={cerrando} />
                                
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Observaciones de Cierre (Opcional):</label>
                                <textarea rows="2" style={{...inputStyle, resize: 'none', marginBottom: '20px'}} placeholder="Indique alguna novedad si existiera..." value={observacionesCierre} onChange={e => setObservacionesCierre(e.target.value)} disabled={cerrando} />
                                
                                <div style={{ marginTop: 'auto' }}>
                                    <div style={{ background: 'rgba(255, 138, 0, 0.06)', border: '1px solid rgba(255, 138, 0, 0.15)', padding: '12px 14px', borderRadius: '8px', color: 'var(--accent-secondary)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                                        <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span>El cierre es irreversible. La sesión actual de caja finalizará.</span>
                                    </div>
                                    <button type="submit" disabled={cerrando} style={{...btnStyle, padding: '16px', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--accent-secondary)', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                        {cerrando ? 'Cerrando Turno...' : 'Finalizar Turno y Cerrar Caja'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Toast Notification */}
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white',
                    padding: '15px 25px',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    fontWeight: 'bold',
                    zIndex: 10000,
                    transform: toast.show ? 'translateY(0)' : 'translateY(150px)',
                    opacity: toast.show ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
                </div>
            </div>

            {/* Modal: Confirmación Cierre */}
            {confirmModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px', backdropFilter: 'blur(6px)'
                }}>
                    <div style={{
                        background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
                        borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '460px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                            <div style={{ background: 'rgba(255,138,0,0.15)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
                                <AlertTriangle size={28} color="var(--accent-secondary)" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '700' }}>Confirmar Cierre</h2>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Turno: {sesionActiva?.turno}</p>
                            </div>
                            <button onClick={() => setConfirmModalOpen(false)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={22} />
                            </button>
                        </div>

                        {/* Aviso */}
                        <div style={{ background: 'rgba(255,138,0,0.08)', border: '1px solid rgba(255,138,0,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <AlertTriangle size={18} color="var(--accent-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ color: 'var(--accent-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                                ¿Está seguro de cerrar la caja? Al confirmar, la sesión actual terminará y no se podrán registrar más ventas ni movimientos en este turno.
                            </span>
                        </div>

                        {/* Resumen */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', marginBottom: '24px', border: '1px solid var(--panel-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Efectivo físico declarado:</span>
                                <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(montoFisicoCajero || 0).toFixed(2)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Fondo para siguiente turno:</span>
                                <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(fondoParaSiguiente || 0).toFixed(2)}</strong>
                            </div>
                        </div>

                        {/* Botones */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setConfirmModalOpen(false)}
                                disabled={cerrando}
                                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCerrarCaja}
                                disabled={cerrando}
                                style={{ flex: 1, padding: '13px', borderRadius: '10px', border: 'none', background: cerrando ? '#666' : 'var(--accent-secondary)', color: 'white', fontWeight: 700, cursor: cerrando ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}
                            >
                                {cerrando ? 'Cerrando...' : 'Cerrar Caja'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CierreCaja;
