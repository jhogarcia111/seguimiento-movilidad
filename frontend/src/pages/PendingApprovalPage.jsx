import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoContext } from '../contexts/VideoContext';
import useTitoModal from '../hooks/useTitoModal';
import { Volume2, VolumeX, X } from 'lucide-react';
import './PendingApprovalPage.css';

function PendingApprovalPage() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const { getRandomVideo, getRandomMessage } = useTitoModal();
  const { registerPageVideo, unregisterPageVideo } = useVideoContext();

  // Video de saludo de Tito
  const greetingVideo = getRandomVideo('welcome');
  const greetingMessage = getRandomMessage('welcome');

  // Registrar el video en el contexto
  useEffect(() => {
    if (videoRef.current) {
      registerPageVideo(videoRef);
      return () => {
        unregisterPageVideo(videoRef);
      };
    }
  }, [registerPageVideo, unregisterPageVideo]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-approval-container">
        {/* Botón de cerrar (X) */}
        <button
          onClick={() => navigate('/')}
          className="pending-close-button"
          aria-label="Cerrar y volver a inicio"
        >
          <X className="pending-close-icon" />
        </button>

        {/* Sección izquierda: Video de Tito */}
        <div className="pending-video-section">
          <video
            ref={videoRef}
            className="pending-video"
            loop
            autoPlay
            playsInline
            muted={isMuted}
            onLoadedData={() => {
              if (videoRef.current) {
                // Intentar reproducir con sonido habilitado
                videoRef.current.muted = false;
                setIsMuted(false);
                videoRef.current.play().catch((error) => {
                  // Si falla, reproducir sin sonido
                  console.log('Error al reproducir con sonido, intentando sin sonido:', error);
                  videoRef.current.muted = true;
                  setIsMuted(true);
                  videoRef.current.play().catch(console.error);
                });
              }
            }}
          >
            <source src={greetingVideo} type="video/mp4" />
            Tu navegador no soporta videos.
          </video>
          <button
            onClick={toggleMute}
            className="pending-mute-button"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? (
              <VolumeX className="pending-mute-icon" />
            ) : (
              <Volume2 className="pending-mute-icon" />
            )}
          </button>
        </div>

        {/* Sección derecha: Mensaje de aprobación pendiente */}
        <div className="pending-message-section">
          <div className="pending-message-content">
            <div className="pending-header">
              <div className="pending-avatar">
                <span className="pending-avatar-text">🚦</span>
              </div>
              <div>
                <h1 className="pending-title">Transito - Tito</h1>
                <p className="pending-subtitle">¡Hola! 👋</p>
              </div>
            </div>

            <div className="pending-message">
              <div className="pending-success-badge">
                <span className="pending-check-icon">✅</span>
                <h2 className="pending-success-title">¡Inscripción Recibida!</h2>
              </div>
              
              <p className="pending-message-text highlight">
                Tu solicitud de registro ha sido recibida exitosamente. Estamos validando tu información y te notificaremos cuando tu cuenta esté activa.
              </p>

              <div className="pending-benefits-section">
                <h3 className="pending-benefits-title">🌟 ¡Bienvenido a Transito Tito! 🌟</h3>
                <p className="pending-intro-text">
                  Soy <strong>Tito</strong>, tu asistente virtual para el seguimiento de movilidad en Bogotá. 
                  Una vez que tu cuenta sea aprobada, podrás disfrutar de:
                </p>
                <ul className="pending-benefits-list">
                  <li className="pending-benefit-item">
                    <span className="benefit-icon">🔍</span>
                    <span><strong>Búsqueda por Sector:</strong> Encuentra problemas de movilidad en cualquier zona de Bogotá</span>
                  </li>
                  <li className="pending-benefit-item">
                    <span className="benefit-icon">⏱️</span>
                    <span><strong>Información en Tiempo Real:</strong> Datos actualizados cada 30 minutos</span>
                  </li>
                  <li className="pending-benefit-item">
                    <span className="benefit-icon">📱</span>
                    <span><strong>Historial de Búsquedas:</strong> Guarda tus consultas anteriores</span>
                  </li>
                  <li className="pending-benefit-item">
                    <span className="benefit-icon">🚦</span>
                    <span><strong>Asistente Personal:</strong> Te guiaré en cada paso de tu experiencia</span>
                  </li>
                </ul>
              </div>

              <div className="pending-wait-message">
                <p className="pending-message-text">
                  Por favor, espera a que nuestro equipo valide tu solicitud. Te notificaremos por email cuando tu cuenta esté lista.
                </p>
              </div>
            </div>

            <div className="pending-signature">
              <p className="pending-signature-text">
                Con cariño,<br />
                <strong>Transito - Tito</strong> 🚦
              </p>
            </div>

            <div className="pending-actions">
              <button 
                onClick={() => navigate('/')} 
                className="pending-understood-button"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingApprovalPage;

