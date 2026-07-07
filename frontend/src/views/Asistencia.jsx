import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  XCircle, 
  User,
  Clock,
  History,
  X,
  Camera
} from 'lucide-react';
import api from '../services/api';
import PageLayout from '../components/layout/PageLayout';

const Asistencia = () => {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // States for Facial Recognition
  const [accessMode, setAccessMode] = useState('DNI'); // 'DNI' | 'FACIAL'
  const [loadingModels, setLoadingModels] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('');
  const [cooldown, setCooldown] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);
  const cooldownRef = useRef(false);
  const faceDetectionActiveRef = useRef(false);
  const matcherRef = useRef(null);
  const modelsLoadedRef = useRef(false);
  const cameraContainerRef = useRef(null);

  // When cameraActive changes, move the always-mounted <video> into the visible container
  useEffect(() => {
    const vid = videoRef.current;
    const container = cameraContainerRef.current;
    if (!vid || !container) return;

    if (cameraActive) {
      vid.style.display = 'block';
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.objectFit = 'cover';
      vid.style.position = 'static';
      if (!container.contains(vid)) {
        container.prepend(vid);
      }
    } else {
      vid.style.display = 'none';
      vid.style.width = '0';
      vid.style.height = '0';
      vid.style.position = 'absolute';
    }
  }, [cameraActive]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const resp = await api.get('/asistencias');
      // Sort by date descending
      const sorted = resp.data.sort((a, b) => new Date(b.fechaHoraIngreso) - new Date(a.fechaHoraIngreso));
      setHistoryData(sorted);
      setShowHistory(true);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      window.speechSynthesis.speak(utterance);
    }
  };

  const registerAttendanceByDni = async (dniVal) => {
    setLoading(true);
    setResult(null);
    try {
      const resp = await api.post('/asistencias/registrar-ingreso', { dni: dniVal });
      setResult({
        success: true,
        message: '¡Acceso Concedido!',
        data: resp.data
      });
      speak('Acceso Concedido');
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || 'Error desconocido';
      setResult({
        success: false,
        message: errorMsg
      });
      speak('Acceso Denegado');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!dni || dni.length !== 8) {
      setResult({
        success: false,
        message: 'El DNI debe tener exactamente 8 dígitos.'
      });
      speak('Acceso Denegado');
      return;
    }
    const success = await registerAttendanceByDni(dni);
    if (success) {
      setDni('');
    }
  };

  const fetchActiveMembersForFace = async () => {
    try {
      const resp = await api.get('/socios');
      const activeOnes = resp.data.filter(s => s.estado === 'ACTIVO');
      return activeOnes;
    } catch (err) {
      console.error("Error fetching active members", err);
      return [];
    }
  };

  const buildFaceMatcher = (members) => {
    const labeled = members
      .filter(m => m.faceDescriptor && m.faceDescriptor.trim() !== '')
      .map(m => {
        try {
          const arr = JSON.parse(m.faceDescriptor);
          return new window.faceapi.LabeledFaceDescriptors(m.dni, [new Float32Array(arr)]);
        } catch (e) {
          console.error('Error parsing descriptor for DNI ' + m.dni, e);
          return null;
        }
      })
      .filter(Boolean);
    if (labeled.length === 0) return null;
    console.log(`[FaceAPI] Matcher built with ${labeled.length} registered face(s).`);
    return new window.faceapi.FaceMatcher(labeled, 0.6);
  };

  // Self-contained detection loop — no dependency on React state closures
  const COOLDOWN_MS = 15000; // 15 seconds between detections

  const runDetectionLoop = async (members) => {
    faceDetectionActiveRef.current = true;
    console.log('[FaceAPI] Detection loop started.');

    while (faceDetectionActiveRef.current) {
      // Wait for video to be ready
      if (!videoRef.current || !videoRef.current.srcObject || videoRef.current.readyState < 2) {
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // If in cooldown, skip detection entirely
      if (isProcessingRef.current || cooldownRef.current) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      try {
        const detection = await window.faceapi
          .detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!faceDetectionActiveRef.current) break;

        if (detection && matcherRef.current) {
          const bestMatch = matcherRef.current.findBestMatch(detection.descriptor);
          console.log('[FaceAPI] Best match:', bestMatch.label, 'distance:', bestMatch.distance.toFixed(3));

          if (bestMatch.label !== 'unknown') {
            // Lock immediately to prevent any concurrent detection
            if (isProcessingRef.current) continue;
            isProcessingRef.current = true;
            cooldownRef.current = true;
            setCooldown(true);

            const matchedSocio = members.find(m => m.dni === bestMatch.label);
            setFaceDetectionStatus(`✅ Identificado: ${matchedSocio?.nombreCompleto || bestMatch.label}`);

            const ok = await registerAttendanceByDni(bestMatch.label);

            if (ok) {
              // Countdown cooldown
              const startTime = Date.now();
              while (faceDetectionActiveRef.current && (Date.now() - startTime) < COOLDOWN_MS) {
                const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - startTime)) / 1000);
                setFaceDetectionStatus(`✅ Ingreso registrado. Próxima detección en ${remaining}s...`);
                await new Promise(r => setTimeout(r, 1000));
              }
            } else {
              await new Promise(r => setTimeout(r, 3000));
            }

            cooldownRef.current = false;
            isProcessingRef.current = false;
            setCooldown(false);
            setFaceDetectionStatus('Alinee su rostro frente a la cámara.');
          } else {
            setFaceDetectionStatus('Rostro detectado — buscando coincidencia...');
          }
        } else {
          setFaceDetectionStatus('Alinee su rostro frente a la cámara.');
        }
      } catch (err) {
        if (faceDetectionActiveRef.current) {
          console.error('[FaceAPI] Detection error:', err);
        }
      }

      await new Promise(r => setTimeout(r, 800));
    }
    console.log('[FaceAPI] Detection loop stopped.');
  };

  const startFacialRecognition = async () => {
    faceDetectionActiveRef.current = false; // stop any previous loop
    setLoadingModels(true);
    setFaceDetectionStatus('Cargando modelos de IA...');
    try {
      if (!window.faceapi) {
        throw new Error('La librería face-api no se ha cargado. Recarga la página.');
      }

      // Load AI models only once
      if (!modelsLoadedRef.current) {
        setFaceDetectionStatus('Descargando modelos de IA (primera vez)...');
        const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
        await Promise.all([
          window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoadedRef.current = true;
        console.log('[FaceAPI] Models loaded successfully.');
      }

      // Fetch active members and build matcher
      setFaceDetectionStatus('Cargando base de datos facial...');
      const members = await fetchActiveMembersForFace();
      const faceCount = members.filter(m => m.faceDescriptor && m.faceDescriptor.trim() !== '').length;

      if (faceCount === 0) {
        alert('No hay socios con rostros registrados. Vaya a "Socios", edite un socio y registre su rostro.');
        setAccessMode('DNI');
        return;
      }

      matcherRef.current = buildFaceMatcher(members);

      // Request camera stream FIRST, then set state
      setFaceDetectionStatus('Iniciando cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      // Attach to the always-mounted video element immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn('Autoplay warning:', e));
        console.log('[FaceAPI] Camera stream attached and playing.');
      } else {
        console.error('[FaceAPI] videoRef.current is null even before setCameraActive!');
      }

      setCameraActive(true);
      setFaceDetectionStatus('Alinee su rostro frente a la cámara.');

      // Start the detection loop
      runDetectionLoop(members);

    } catch (err) {
      console.error('[FaceAPI] Startup error:', err);
      alert('Error: ' + err.message);
      setAccessMode('DNI');
      setCameraActive(false);
    } finally {
      setLoadingModels(false);
    }
  };

  const stopFacialRecognition = () => {
    faceDetectionActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCooldown(false);
    cooldownRef.current = false;
    isProcessingRef.current = false;
    setFaceDetectionStatus('');
  };

  useEffect(() => {
    if (accessMode === 'FACIAL') {
      startFacialRecognition();
    } else {
      stopFacialRecognition();
    }
    return () => stopFacialRecognition();
  }, [accessMode]);

  const filteredHistory = historyData.filter(record => {
    const nombre = record.socio?.nombreCompleto?.toLowerCase() || '';
    const dni = record.socio?.dni || '';
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || nombre.includes(q) || dni.includes(q);

    const fecha = record.fechaHoraIngreso ? new Date(record.fechaHoraIngreso) : null;
    const matchesFechaDesde = !fechaDesde || (fecha && fecha >= new Date(fechaDesde));
    const matchesFechaHasta = !fechaHasta || (fecha && fecha <= new Date(fechaHasta + 'T23:59:59'));

    return matchesSearch && matchesFechaDesde && matchesFechaHasta;
  });

  return (
    <PageLayout
      title={<span>Control de <span className="text-gradient">Acceso</span></span>}
      subtitle="Ingresa el DNI del socio para validar su ingreso al gimnasio en tiempo real."
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <style>{`
          .asistencia-card {
            padding: 48px;
            text-align: center;
          }
          .asistencia-form {
            position: relative;
            display: flex;
            gap: 16px;
          }
          .asistencia-input-wrapper {
            position: relative;
            flex: 1;
          }
          .asistencia-btn {
            width: 180px;
            height: 64px;
            font-size: 1.1rem;
          }
          .result-card {
            margin-top: 40px;
            display: flex;
            align-items: center;
            gap: 24px;
            padding: 32px;
            text-align: left;
          }
          .history-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
            animation: fadeIn 0.3s ease-out;
          }
          .history-modal {
            width: 100%;
            max-width: 800px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            border-radius: 24px;
            background: var(--bg-color);
            background-image: var(--body-bg-gradient);
            border: 1px solid var(--panel-border);
            box-shadow: 0 24px 48px rgba(0,0,0,0.4);
            overflow: hidden;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .history-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .history-table th {
            padding: 16px 20px;
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1px;
            border-bottom: 1px solid var(--panel-border);
            position: sticky;
            top: 0;
            background: var(--bg-color);
            z-index: 10;
          }
          .history-table td {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            color: var(--text-main);
          }
          .history-table tbody tr {
            transition: var(--transition-smooth);
          }
          .history-table tbody tr:hover {
            background: rgba(255, 255, 255, 0.05);
          }
          .close-btn {
            background: rgba(255,255,255,0.05);
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition-smooth);
          }
          .close-btn:hover {
            background: rgba(255,62,62,0.1);
            color: var(--accent-primary);
            transform: rotate(90deg);
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.03); }
            100% { transform: scale(1); }
          }
          .history-soft-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 28px;
            border-radius: 30px;
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.25);
            cursor: pointer;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.3s ease;
          }
          .history-soft-btn:hover {
            background: rgba(59, 130, 246, 0.18);
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
          }
          .history-soft-btn:active {
            transform: translateY(0);
          }
          .history-soft-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          @media (max-width: 600px) {
            .asistencia-card {
              padding: 24px 16px;
            }
            .asistencia-form {
              flex-direction: column;
            }
            .asistencia-btn {
              width: 100%;
            }
            .result-card {
              flex-direction: column;
              text-align: center;
              padding: 24px 16px;
              gap: 16px;
            }
            .history-table th, .history-table td {
              padding: 12px 10px;
            }
          }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button 
            className="history-soft-btn" 
            onClick={fetchHistory}
            disabled={loadingHistory}
          >
            <History size={18} />
            {loadingHistory ? 'Cargando...' : 'Ver Historial'}
          </button>
        </div>

        <section className="card asistencia-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
          {/* 
            Hidden video element always in the DOM so videoRef.current is always populated.
            Visibility is controlled by the facial recognition panel below.
          */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ display: 'none', width: 0, height: 0, position: 'absolute' }}
          />
          
          {/* Selector de modo de acceso */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '30px', padding: '4px', width: 'fit-content' }}>
            <button 
              type="button"
              onClick={() => setAccessMode('DNI')}
              style={{
                padding: '10px 24px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                background: accessMode === 'DNI' ? 'var(--accent-primary)' : 'transparent',
                color: accessMode === 'DNI' ? '#000' : 'var(--text-muted)',
                transition: 'all .2s'
              }}
            >
              DNI Manual / Barras
            </button>
            <button 
              type="button"
              onClick={() => setAccessMode('FACIAL')}
              style={{
                padding: '10px 24px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                background: accessMode === 'FACIAL' ? 'var(--accent-secondary)' : 'transparent',
                color: accessMode === 'FACIAL' ? '#000' : 'var(--text-muted)',
                transition: 'all .2s'
              }}
            >
              📷 Reconocimiento Facial
            </button>
          </div>

          {accessMode === 'DNI' ? (
            <form className="asistencia-form" onSubmit={handleRegister} style={{ width: '100%' }}>
              <div className="asistencia-input-wrapper">
                <Search 
                  size={24} 
                  color="var(--text-muted)" 
                  style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input 
                  type="text" 
                  placeholder="Ej: 72839401" 
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  style={{ width: '100%', paddingLeft: '56px', fontSize: '1.2rem', height: '64px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', borderRadius: '12px' }}
                  maxLength={8}
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary asistencia-btn" 
                disabled={loading || !dni || dni.length !== 8}
              >
                {loading ? 'Validando...' : 'REGISTRAR'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
              {loadingModels && (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', border: '3px solid var(--panel-border)', borderTopColor: 'var(--accent-secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <span>{faceDetectionStatus}</span>
                </div>
              )}

              {/* Camera container — the always-mounted <video> node is moved here by useEffect */}
              <div
                ref={cameraContainerRef}
                style={{
                  position: 'relative',
                  width: '100%', maxWidth: '320px', aspectRatio: '4/3',
                  borderRadius: '16px', overflow: 'hidden',
                  border: `3px solid ${cooldown ? '#22c55e' : 'var(--panel-border)'}`,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                  background: '#111',
                  display: loadingModels ? 'none' : 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                {cooldown && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(34,197,94,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', zIndex: 2 }}>
                    <CheckCircle size={64} style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
                  </div>
                )}
              </div>

              {!loadingModels && (
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: cooldown ? '#22c55e' : 'var(--text-main)',
                  background: 'var(--panel-bg)',
                  padding: '8px 24px',
                  borderRadius: '30px',
                  border: '1px solid var(--panel-border)',
                  textAlign: 'center',
                  animation: cooldown ? 'pulse 1s infinite' : 'none'
                }}>
                  {faceDetectionStatus}
                </div>
              )}
            </div>
          )}

          {result && (
            <div 
              className="card result-card" 
              style={{ 
                border: `2px solid ${result.success ? '#00ff7f' : '#ff3e3e'}`,
                background: result.success ? 'rgba(0, 255, 127, 0.05)' : 'rgba(255, 62, 62, 0.05)',
              }}
            >
              <div style={{ 
                background: result.success ? '#00ff7f' : '#ff3e3e',
                padding: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg-color)',
                flexShrink: 0
              }}>
                {result.success ? <CheckCircle size={32} /> : <XCircle size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '4px', color: result.success ? 'var(--text-main)' : '#ff3e3e' }}>{result.message}</h3>
                {result.success && result.data?.socio && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} />
                      <span>Socio: {result.data.socio.nombreCompleto}</span>
                    </div>
                    {result.data.fechaHoraIngreso && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} />
                        <span>Hora de entrada: {new Date(result.data.fechaHoraIngreso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                )}
                {!result.success && (
                  <p style={{ color: '#ff3e3e', fontWeight: 'bold', marginTop: '8px' }}>
                    {result.message.includes("DENEGADO") 
                      ? "BLOQUEO ACTIVO: El socio no puede ingresar hasta que regularice su deuda."
                      : "Comuníquese con administración para regularizar su situación."}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <div style={{ marginTop: '40px' }}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} /> Sistema de vigilancia activo. Tema dinámico activado.
          </p>
        </div>
      </div>

      {showHistory && (
        <div className="history-overlay">
          <div className="glass history-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <History style={{ color: 'var(--accent-secondary)' }} size={28} />
                <span className="text-gradient">Historial de Ingresos</span>
              </h2>
              <button className="close-btn" onClick={() => setShowHistory(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', gap: '12px', padding: '16px 32px', borderBottom: '1px solid var(--panel-border)', flexWrap: 'wrap', background: 'rgba(255,255,255,0.015)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s_]/g, ''))}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { const d = new Date(); setFechaDesde(d.toISOString().split('T')[0]); setFechaHasta(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Hoy</button>
                  <button onClick={() => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const from = new Date(d.setDate(diff)); const to = new Date(); setFechaDesde(from.toISOString().split('T')[0]); setFechaHasta(to.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Semana</button>

                  <button onClick={() => { const d = new Date(); const from = new Date(d); from.setDate(d.getDate() - 30); setFechaDesde(from.toISOString().split('T')[0]); setFechaHasta(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>30 Días</button>
                  <button onClick={() => { const d = new Date(); setFechaDesde(new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]); setFechaHasta(d.toISOString().split('T')[0]); }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Año</button>
                  <div style={{ width: '1px', height: '28px', background: 'var(--panel-border)', margin: '0 4px' }} />
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', width: '140px' }} />
                  {(searchTerm || fechaDesde || fechaHasta) && (
                    <button onClick={() => { setSearchTerm(''); setFechaDesde(''); setFechaHasta(''); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,62,62,0.1)', color: '#ff3e3e', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }} title="Limpiar filtros">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              {historyData.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <History size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                  <p>No hay registros de asistencia aún.</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Search size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                  <p>No se encontraron resultados con los filtros aplicados.</p>
                </div>
              ) : (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Socio</th>
                      <th>DNI</th>
                      <th>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((record) => (
                      <tr key={record.id}>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--panel-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--panel-border)' }}>
                              <User size={14} color="var(--accent-secondary)" />
                            </div>
                            {record.socio?.nombreCompleto || 'Desconocido'}
                          </div>
                        </td>
                        <td style={{ opacity: 0.8 }}>{record.socio?.dni || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
                            <Clock size={14} color="var(--text-muted)" />
                            {record.fechaHoraIngreso ? new Date(record.fechaHoraIngreso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Asistencia;
