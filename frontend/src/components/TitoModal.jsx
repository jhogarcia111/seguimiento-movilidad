import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import './TitoModal.css';

const TitoModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  module, 
  videoPath, 
  message, 
  title,
  confirmButtonText = "¡Genial!" // Texto personalizable del botón
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Sonido habilitado por defecto
  const [videoRef, setVideoRef] = useState(null);

  // Auto-play cuando el modal se abre
  useEffect(() => {
    if (isOpen && videoRef) {
      // Intentar reproducir con sonido habilitado
      videoRef.muted = false;
      setIsMuted(false);
      
      const playVideo = async () => {
        try {
          await videoRef.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Error al reproducir video con sonido, intentando sin sonido:', error);
          // Si falla con sonido, intentar sin sonido (política del navegador)
          videoRef.muted = true;
          setIsMuted(true);
          try {
            await videoRef.play();
            setIsPlaying(true);
          } catch (error2) {
            console.log('Error al reproducir video:', error2);
            // Reintentar después de un delay
            setTimeout(() => {
              if (videoRef) {
                videoRef.play().catch(console.error);
              }
            }, 500);
          }
        }
      };
      
      playVideo();
    }
  }, [isOpen, videoRef]);

  // Pausar video cuando el modal se cierra
  useEffect(() => {
    if (!isOpen && videoRef) {
      videoRef.pause();
      setIsPlaying(false);
    }
  }, [isOpen, videoRef]);

  const togglePlayPause = () => {
    if (videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleConfirm = () => {
    if (videoRef) {
      videoRef.pause();
    }
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="tito-modal-overlay">
      <div className="tito-modal-container">
        <div className="tito-modal-content">
          {/* Content Section - IZQUIERDA (primero en móvil) */}
          <div className="tito-modal-text-section">
            {/* Header con avatar y título */}
            <div className="tito-modal-header">
              <div className="tito-modal-avatar">
                <span className="tito-modal-avatar-text">🚦</span>
              </div>
              <div>
                <h2 className="tito-modal-title">
                  Transito - Tito
                </h2>
                <p className="tito-modal-subtitle">{title}</p>
              </div>
            </div>

            {/* Mensaje con scroll */}
            <div className="tito-modal-message">
              <div className="tito-modal-message-text">
                {message}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="tito-modal-buttons">
              <button
                onClick={handleConfirm}
                className="tito-modal-button tito-modal-button-confirm"
              >
                {confirmButtonText}
              </button>
            </div>
          </div>

          {/* Video Section - DERECHA (segundo en desktop) */}
          <div className="tito-modal-video-section">
            <video
              ref={setVideoRef}
              className="tito-modal-video"
              loop
              autoPlay
              playsInline
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={() => {
                if (videoRef && isOpen) {
                  videoRef.play().catch(console.error);
                }
              }}
            >
              <source src={videoPath} type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
            
            {/* Botón de mute siempre visible en la izquierda */}
            <button
              onClick={toggleMute}
              className="tito-modal-mute-button"
              aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted ? (
                <VolumeX className="tito-modal-mute-icon" />
              ) : (
                <Volume2 className="tito-modal-mute-icon" />
              )}
            </button>
            
            {/* Controles de video (play/pause) */}
            <div className="tito-modal-video-controls">
              <button
                onClick={togglePlayPause}
                className="tito-modal-control-button"
                aria-label={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause className="tito-modal-icon" />
                ) : (
                  <Play className="tito-modal-icon" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Botón de cerrar (X) - ejecuta la misma acción que el botón de confirmar */}
        <button
          onClick={handleConfirm}
          className="tito-modal-close-button"
          aria-label="Continuar"
        >
          <X className="tito-modal-close-icon" />
        </button>
      </div>
    </div>
  );
};

export default TitoModal;

