import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, AlertTriangle, CheckCircle, Clock, Plus, X, Lock, RefreshCw } from 'lucide-react';
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
    const [pinAdmin, setPinAdmin] = useState(''); // Solo para RETIRO_FONDOS

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
            alert('Error de conexión al verificar el estado de la caja.');
        } finally {
            setLoading(false);
        }
    };

    // ── API: ABRIR CAJA ──
    const handleAbrirCaja = async (e) => {
        e.preventDefault();
        if (!montoInicial) {
            alert("Por favor ingrese el monto inicial de apertura.");
            return;
        }
        try {
            const username = localStorage.getItem('username') || 'Usuario Desconocido';
            const payload = {
                username,
                turno: turnoSeleccionado,
                montoInicial: parseFloat(montoInicial || 0),
                observaciones: observacionesApertura
            };
            await api.post('/sesiones-caja/abrir', payload);
            alert('¡Caja abierta exitosamente!');
            verificarSesionActiva();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al abrir caja');
        }
    };

    // ── API: CERRAR CAJA (CIEGO) ──
    const handleCerrarCaja = async (e) => {
        e.preventDefault();
        
        if (montoFisicoCajero === '') {
            alert('Por favor ingrese el Total EFECTIVO físico en gaveta.');
            return;
        }
        if (fondoParaSiguiente === '') {
            alert('Por favor ingrese cuánto dejará en caja para el siguiente turno.');
            return;
        }

        if (!window.confirm('¿Está seguro de cerrar la caja? Esta acción es irreversible.')) return;

        try {
            const payload = {
                sesionId: sesionActiva.id,
                montoFinalReal: parseFloat(montoFisicoCajero || 0),
                fondoParaSiguiente: parseFloat(fondoParaSiguiente || 0),
                observaciones: observacionesCierre
            };
            const res = await api.post('/sesiones-caja/cerrar', payload);
            
            // Mostrar resultado del cierre
            setResultadoCierre(res.data);
            setSesionActiva(null);
        } catch (error) {
            alert(error.response?.data?.error || 'Error al cerrar caja');
        }
    };

    // ── API: REGISTRAR MOVIMIENTO ──
    const handleRegistrarMovimiento = async (e) => {
        e.preventDefault();
        
        if (!movimientoDesc || !movimientoMonto) {
            alert("Por favor complete el motivo y el monto.");
            return;
        }

        try {
            const username = localStorage.getItem('username') || 'Cajero';
            
            if (movimientoTipo === 'EGRESO') {
                const payload = { descripcion: movimientoDesc, monto: parseFloat(movimientoMonto), username };
                await api.post('/sesiones-caja/egresos', payload);
            } else {
                if (!pinAdmin) {
                    alert('El PIN de administrador es obligatorio para retiros de fondos.');
                    return;
                }
                const payload = { descripcion: movimientoDesc, monto: parseFloat(movimientoMonto), username, pinAdmin };
                await api.post('/sesiones-caja/retiros', payload);
            }

            alert('Movimiento registrado exitosamente');
            setMovimientoMonto('');
            setMovimientoDesc('');
            setPinAdmin('');
            verificarSesionActiva(); // Refrescar totales
        } catch (error) {
            if (error.response?.status === 403) {
                alert('PIN de administrador incorrecto.');
            } else {
                alert(error.response?.data?.error || 'Error al registrar el movimiento.');
            }
        }
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>Gestión de Caja</h2>
                        <p style={{ color: 'var(--accent-secondary)', margin: 0, marginTop: '8px', fontSize: '1.1rem', fontWeight: '500' }}>
                            {sesionActiva ? `Sesión Activa: Turno ${sesionActiva.turno}` : 'Ninguna sesión activa'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                        <X size={24} />
                    </button>
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
                    <div style={{ maxWidth: '450px', margin: '40px auto' }}>
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={24} color="var(--accent-secondary)" /> Abrir Nuevo Turno</h3>
                            <form onSubmit={handleAbrirCaja}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Turno</label>
                                <select style={inputStyle} value={turnoSeleccionado} onChange={e => setTurnoSeleccionado(e.target.value)}>
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noche">Noche</option>
                                    <option value="General">General (Día completo)</option>
                                </select>
                                
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Fondo Inicial S/ (Sencillo)</label>
                                <input type="number" step="0.01" style={{...inputStyle, fontSize: '1.2rem', fontWeight: 'bold'}} value={montoInicial} onChange={e => setMontoInicial(e.target.value)} />
                                
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Observaciones (Opcional)</label>
                                <textarea rows="2" style={{...inputStyle, resize: 'none'}} value={observacionesApertura} onChange={e => setObservacionesApertura(e.target.value)} placeholder="Ej: La caja inicia con S/10 en monedas..." />
                                
                                <button type="submit" style={{...btnStyle, background: 'var(--accent-secondary)'}}>Abrir Caja Ahora</button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={cardStyle}>
                                <h3 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.4rem' }}>Resumen de Ingresos</h3>
                                {resumen && (
                                    <div style={{ color: 'var(--text-muted)', lineHeight: '2' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                            <span>Fondo Inicial:</span> <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(resumen.montoInicial || 0).toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                            <span>Total Ingresos Generales:</span> <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(resumen.totalIngresos || 0).toFixed(2)}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                            <span>Salidas (Egresos/Retiros):</span> <strong style={{ color: 'var(--accent-primary)' }}>- S/ {parseFloat(resumen.totalMovimientos || 0).toFixed(2)}</strong>
                                        </div>
                                        
                                        <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed var(--panel-border)' }}>
                                            <p style={{ fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '10px', color: 'var(--text-muted)' }}>Desglose por Método (Solo Ingresos)</p>
                                            {Object.entries(resumen.detalle || {}).map(([m, val]) => (
                                                <div key={m} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '5px' }}>
                                                    <span>{String(m).replace('_', ' ')}</span>
                                                    <strong style={{ color: 'var(--text-main)' }}>S/ {parseFloat(val || 0).toFixed(2)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={cardStyle}>
                                <h3 style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '20px', fontSize: '1.4rem' }}>Registrar Salida de Dinero</h3>
                                <form onSubmit={handleRegistrarMovimiento}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <button type="button" onClick={() => setMovimientoTipo('EGRESO')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: movimientoTipo === 'EGRESO' ? 'var(--text-main)' : 'rgba(255,255,255,0.05)', color: movimientoTipo === 'EGRESO' ? 'var(--bg-color)' : 'var(--text-main)', fontWeight: 'bold', transition: 'all 0.2s' }}>
                                            Egreso (Gasto)
                                        </button>
                                        <button type="button" onClick={() => setMovimientoTipo('RETIRO_FONDOS')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: movimientoTipo === 'RETIRO_FONDOS' ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: movimientoTipo === 'RETIRO_FONDOS' ? '#fff' : 'var(--text-main)', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Lock size={16} /> Retiro a Banco
                                        </button>
                                    </div>
                                    
                                    <input type="text" placeholder="Motivo / Descripción" style={inputStyle} value={movimientoDesc} onChange={e => setMovimientoDesc(e.target.value)} />
                                    <input type="number" step="0.01" placeholder="Monto S/" style={inputStyle} value={movimientoMonto} onChange={e => setMovimientoMonto(e.target.value)} />
                                    
                                    {movimientoTipo === 'RETIRO_FONDOS' && (
                                        <div style={{ position: 'relative' }}>
                                            <input type="password" placeholder="PIN de Administrador" style={{...inputStyle, borderColor: '#3b82f6'}} value={pinAdmin} onChange={e => setPinAdmin(e.target.value)} />
                                        </div>
                                    )}
                                    
                                    <button type="submit" style={{...btnStyle, background: movimientoTipo === 'RETIRO_FONDOS' ? '#3b82f6' : 'rgba(255,255,255,0.1)', color: 'var(--text-main)', border: '1px solid var(--panel-border)'}}>
                                        <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                        Registrar {movimientoTipo === 'EGRESO' ? 'Egreso' : 'Retiro'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div style={{ ...cardStyle, border: '2px solid var(--accent-secondary)', background: 'linear-gradient(to bottom right, rgba(255, 138, 0, 0.05), transparent)' }}>
                            <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '12px', fontSize: '1.6rem' }}>Cierre de Turno (Ciego)</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '25px', lineHeight: '1.5' }}>
                                Cuente el dinero físico en su gaveta e ingréselo aquí. El sistema calculará las diferencias internamente para auditoría.
                            </p>

                            <form onSubmit={handleCerrarCaja} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                                        Total EFECTIVO físico en gaveta:
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>S/</span>
                                        <input type="number" step="0.01" style={{...inputStyle, paddingLeft: '45px', fontSize: '2rem', fontWeight: 'bold', background: '#000', marginBottom: 0, height: '70px'}} placeholder="0.00" value={montoFisicoCajero} onChange={e => setMontoFisicoCajero(e.target.value)} />
                                    </div>
                                </div>

                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>¿Cuánto dejará en caja para el siguiente turno?</label>
                                <input type="number" step="0.01" style={inputStyle} placeholder="S/ 0.00" value={fondoParaSiguiente} onChange={e => setFondoParaSiguiente(e.target.value)} />
                                
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Observaciones Finales (Opcional)</label>
                                <textarea rows="2" style={{...inputStyle, resize: 'none'}} value={observacionesCierre} onChange={e => setObservacionesCierre(e.target.value)} />
                                
                                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                                    <div style={{ background: 'rgba(255, 138, 0, 0.1)', padding: '15px', borderRadius: '10px', color: 'var(--accent-secondary)', fontSize: '0.9rem', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                                        <span>Asegúrese de haber contado bien. Al cerrar la caja, la sesión actual terminará y no podrá registrar más movimientos.</span>
                                    </div>
                                    <button type="submit" style={{...btnStyle, padding: '20px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px'}}>
                                        Finalizar Turno y Cerrar Caja
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CierreCaja;
