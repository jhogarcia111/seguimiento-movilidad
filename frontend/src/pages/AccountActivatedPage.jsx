import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideoContext } from '../contexts/VideoContext';
import useTitoModal from '../hooks/useTitoModal';
import { Volume2, VolumeX, X } from 'lucide-react';
import './AccountActivatedPage.css';

function AccountActivatedPage() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const { getRandomVideo, getRandomMessage } = useTitoModal();
  const { registerPageVideo, unregisterPageVideo } = useVideoContext();

  // Video de celebración de Tito
  const celebrationVideo = getRandomVideo('welcome');
  const celebrationMessage = getRandomMessage('welcome');

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

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="account-activated-page">
      <div className="account-activated-container">
        {/* Botón de cerrar (X) */}
        <button
          onClick={handleContinue}
          className="activated-close-button"
          aria-label="Cerrar y continuar"
        >
          <X className="activated-close-icon" />
        </button>

        {/* Sección izquierda: Video de Tito */}
        <div className="activated-video-section">
          <video
            ref={videoRef}
            className="activated-video"
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
            <source src={celebrationVideo} type="video/mp4" />
            Tu navegador no soporta videos.
          </video>
          <button
            onClick={toggleMute}
            className="activated-mute-button"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? (
              <VolumeX className="activated-mute-icon" />
            ) : (
              <Volume2 className="activated-mute-icon" />
            )}
          </button>
        </div>

        {/* Sección derecha: Mensaje de cuenta activada */}
        <div className="activated-message-section">
          <div className="activated-message-content">
            <div className="activated-header">
              <div className="activated-avatar">
                <span className="activated-avatar-text">🚦</span>
              </div>
              <div>
                <h1 className="activated-title">Transito - Tito</h1>
                <p className="activated-subtitle">¡Tu cuenta está activa! 🎉</p>
              </div>
            </div>

            <div className="activated-message">
              <div className="activated-success-badge">
                <span className="activated-check-icon">✅</span>
                <h2 className="activated-success-title">¡Cuenta Activada!</h2>
              </div>
              
              <p className="activated-message-text highlight">
                ¡Excelentes noticias! Tu cuenta ha sido aprobada y ya está completamente activa. 
                Ahora puedes comenzar a usar todas las funcionalidades de Transito Tito.
              </p>

              <div className="activated-benefits-section">
                <h3 className="activated-benefits-title">🌟 ¡Bienvenido a la Comunidad! 🌟</h3>
                <p className="activated-intro-text">
                  Soy <strong>Tito</strong>, tu asistente virtual. Estoy aquí para ayudarte a navegar 
                  por la ciudad de Bogotá de manera más inteligente. Con tu cuenta activa, ahora puedes:
                </p>
                <ul className="activated-benefits-list">
                  <li className="activated-benefit-item">
                    <span className="benefit-icon">🔍</span>
                    <span><strong>Buscar por Sector:</strong> Consulta problemas de movilidad en cualquier zona</span>
                  </li>
                  <li className="activated-benefit-item">
                    <span className="benefit-icon">⏱️</span>
                    <span><strong>Información Actualizada:</strong> Datos en tiempo real actualizados constantemente</span>
                  </li>
                  <li className="activated-benefit-item">
                    <span className="benefit-icon">📱</span>
                    <span><strong>Historial Completo:</strong> Accede a todas tus búsquedas anteriores</span>
                  </li>
                  <li className="activated-benefit-item">
                    <span className="benefit-icon">🚦</span>
                    <span><strong>Asistencia Personalizada:</strong> Te guiaré en cada paso de tu viaje</span>
                  </li>
                </ul>
              </div>

              <div className="activated-ready-message">
                <p className="activated-message-text">
                  ¡Estás listo para comenzar! Haz clic en "Continuar" para explorar la aplicación.
                </p>
              </div>
            </div>

            <div className="activated-signature">
              <p className="activated-signature-text">
                Con entusiasmo,<br />
                <strong>Transito - Tito</strong> 🚦
              </p>
            </div>

            <div className="activated-actions">
              <button 
                onClick={handleContinue} 
                className="activated-continue-button"
              >
                ¡Continuar!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountActivatedPage;

