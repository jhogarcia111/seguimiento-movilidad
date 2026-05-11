import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useVideoContext } from '../contexts/VideoContext';
import { getGeneralMobilityProblems } from '../services/api';
import IncidentList from '../components/IncidentList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import TitoModal from '../components/TitoModal';
import useTitoModal from '../hooks/useTitoModal';
import { Volume2, VolumeX } from 'lucide-react';
import './HomePage.css';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [heroVideoMuted, setHeroVideoMuted] = useState(false);
  const heroVideoRef = useRef(null);
  const noResultsVideoRef = useRef(null);
  const { getRandomVideo, getRandomMessage, getRandomButtonText } = useTitoModal();
  const { registerPageVideo, unregisterPageVideo } = useVideoContext();
  
  // Rastrear todos los videos usados en la página para evitar duplicados
  // Video 1: Hero section (welcome)
  // Video 2: Resultado de diagnóstico (clear) - solo cuando no hay resultados
  // Video 3: Modal de saludo (welcome)
  const [usedVideos, setUsedVideos] = useState(() => {
    // Obtener todos los videos disponibles de cada tipo
    const allWelcomeVideos = [
      "/videos/Tito- saludando.mp4",
      "/videos/Tito- saludando 1.mp4",
      "/videos/Tito- saludando 2.mp4"
    ];
    const allClearVideos = [
      "/videos/Tito- Camino libre.mp4",
      "/videos/Tito- Camino libre 2.mp4",
      "/videos/Tito- Camino libre 3.mp4"
    ];
    
    // Seleccionar videos únicos
    const heroVideo = allWelcomeVideos[Math.floor(Math.random() * allWelcomeVideos.length)];
    const remainingWelcomeVideos = allWelcomeVideos.filter(v => v !== heroVideo);
    const modalVideo = remainingWelcomeVideos[Math.floor(Math.random() * remainingWelcomeVideos.length)];
    const clearVideo = allClearVideos[Math.floor(Math.random() * allClearVideos.length)];
    
    return {
      hero: heroVideo,
      modal: modalVideo,
      clear: clearVideo
    };
  });
  
  const heroVideoPath = usedVideos.hero;
  const modalVideoPath = usedVideos.modal;

  const toggleHeroMute = () => {
    if (heroVideoRef.current) {
      heroVideoRef.current.muted = !heroVideoMuted;
      setHeroVideoMuted(!heroVideoMuted);
    }
  };

  // Obtener problemas generales de movilidad al cargar la página
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['general-mobility'],
    queryFn: getGeneralMobilityProblems,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    retry: 3, // Aumentar reintentos
    retryDelay: 1000, // Esperar 1 segundo entre reintentos
  });

  // Registrar el video del hero en el contexto de videos
  useEffect(() => {
    if (heroVideoRef.current) {
      registerPageVideo(heroVideoRef);
      return () => {
        unregisterPageVideo(heroVideoRef);
      };
    }
  }, [registerPageVideo, unregisterPageVideo]);

  // Registrar el video de "no-results" en el contexto de videos (solo cuando no hay resultados)
  useEffect(() => {
    if (data && !data.incidents?.length && noResultsVideoRef.current) {
      registerPageVideo(noResultsVideoRef);
      return () => {
        unregisterPageVideo(noResultsVideoRef);
      };
    }
  }, [data, registerPageVideo, unregisterPageVideo]);

  // Mostrar modal de bienvenida al cargar la página
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcomeModal(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSearchClick = (e) => {
    // Si no está autenticado, redirigir al login
    if (!isAuthenticated) {
      e.preventDefault();
      navigate('/login');
    }
    // Si está autenticado, dejar que el Link navegue directamente a /buscar
    // El modal inicial de SectorSearch se mostrará automáticamente
  };

  return (
    <div className="home-page">
      <div className="hero">
        <div className="hero-content">
          <div className="hero-text">
        <h1>🚦 Seguimiento de Movilidad en Bogotá</h1>
        <p className="subtitle">
          Consulta problemas de movilidad en tiempo real por sector
        </p>
            <Link to={isAuthenticated ? "/buscar" : "/login"} onClick={handleSearchClick} className="cta-button">
          Buscar por Sector
        </Link>
          </div>
          <div className="hero-video-section">
            <video
              ref={heroVideoRef}
              className="hero-video"
              loop
              autoPlay
              playsInline
              muted={heroVideoMuted}
              onLoadedData={() => {
                if (heroVideoRef.current) {
                  // Intentar reproducir con sonido habilitado
                  heroVideoRef.current.muted = false;
                  setHeroVideoMuted(false);
                  heroVideoRef.current.play().catch((error) => {
                    // Si falla, reproducir sin sonido
                    console.log('Error al reproducir con sonido, intentando sin sonido:', error);
                    heroVideoRef.current.muted = true;
                    setHeroVideoMuted(true);
                    heroVideoRef.current.play().catch(console.error);
                  });
                }
              }}
            >
              <source src={heroVideoPath} type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
            <button
              onClick={toggleHeroMute}
              className="hero-mute-button"
              aria-label={heroVideoMuted ? "Activar sonido" : "Silenciar"}
            >
              {heroVideoMuted ? (
                <VolumeX className="hero-mute-icon" />
              ) : (
                <Volume2 className="hero-mute-icon" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sección de problemas generales de movilidad */}
      <div className="general-mobility-section">
        {isLoading && (
          <>
            <h2>📊 Últimos Problemas de Movilidad Reportados en Bogotá</h2>
            <p className="section-subtitle">
              Estos son algunos de los problemas de movilidad más recientes reportados en la ciudad.
              Ejemplo de cómo se verían los resultados de una búsqueda.
            </p>
            <div className="loading-container">
              <LoadingSpinner />
              <p>Cargando problemas de movilidad...</p>
            </div>
          </>
        )}

        {error && (
          <>
            <h2>📊 Últimos Problemas de Movilidad Reportados en Bogotá</h2>
            <p className="section-subtitle">
              Estos son algunos de los problemas de movilidad más recientes reportados en la ciudad.
              Ejemplo de cómo se verían los resultados de una búsqueda.
            </p>
            <ErrorMessage 
              message={error.message || 'Error al cargar problemas de movilidad'}
              onRetry={refetch}
            />
          </>
        )}

        {data && !isLoading && !error && (
          <>
            {data.incidents && data.incidents.length > 0 ? (
              <>
                <h2>📊 Últimos Problemas de Movilidad Reportados en Bogotá</h2>
                <p className="section-subtitle">
                  Estos son algunos de los problemas de movilidad más recientes reportados en la ciudad.
                  Ejemplo de cómo se verían los resultados de una búsqueda.
                </p>
                <div className={`incident-count-header ${data.isMock ? 'mock-data' : ''}`}>
                  {data.count} problema{data.count !== 1 ? 's' : ''} reportado{data.count !== 1 ? 's' : ''} recientemente
                  {data.source === 'cache' && (
                    <span className="cache-badge">📦 Desde cache</span>
                  )}
                  {data.isMock && (
                    <span className="mock-badge">📋 Datos de prueba</span>
                  )}
                </div>
                <IncidentList incidents={data.incidents} isMock={data.isMock} />
              </>
            ) : (
              <div className="no-results">
                <div className="no-results-content">
                  <div className="no-results-text">
                    <h2>📊 Últimos Problemas de Movilidad Reportados en Bogotá</h2>
                    <p className="section-subtitle">
                      Estos son algunos de los problemas de movilidad más recientes reportados en la ciudad.
                      Ejemplo de cómo se verían los resultados de una búsqueda.
                    </p>
                    <div className="no-results-message-container">
                      <p className="no-results-message">✅ No hay problemas de movilidad reportados en este momento</p>
                      <p className="no-results-note">
                        Todo está normal en la ciudad. Si hay tráfico, puede ser por flujo normal de vehículos.
                      </p>
                    </div>
                  </div>
                  <div className="no-results-video-section">
                    <video
                      ref={noResultsVideoRef}
                      className="no-results-video"
                      loop
                      autoPlay
                      playsInline
                      muted
                      onLoadedData={(e) => {
                        e.target.play().catch(console.error);
                      }}
                    >
                      <source src={usedVideos.clear} type="video/mp4" />
                      Tu navegador no soporta videos.
                    </video>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📍</div>
          <h3>Búsqueda por Sector</h3>
          <p>Busca por nombre de vía o intersección (ej: "Avenida Boyacá")</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Tiempo Real</h3>
          <p>Información actualizada de cuentas oficiales y bogota.gov.co</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>PWA</h3>
          <p>Instala como app en tu móvil para acceso rápido</p>
        </div>
      </div>

      <div className="info-section">
        <h2>Fuentes de Información</h2>
        <div className="sources">
          <div className="source-item">
            <strong>@SectorMovilidad</strong>
            <span>Secretaría Distrital de Movilidad</span>
          </div>
          <div className="source-item">
            <strong>@BogotaTransito</strong>
            <span>Tránsito Bogotá</span>
          </div>
          <div className="source-item">
            <strong>@TransMilenio</strong>
            <span>TransMilenio</span>
          </div>
          <div className="source-item">
            <strong>bogota.gov.co</strong>
            <span>Actualizaciones en vivo oficiales</span>
          </div>
        </div>
      </div>

      {/* Modal de Bienvenida con video y texto aleatorios */}
      <TitoModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onConfirm={() => setShowWelcomeModal(false)}
        module="welcome"
        videoPath={modalVideoPath}
        message={getRandomMessage('welcome')}
        title="¡Bienvenido a Transito Tito! 🚀"
        confirmButtonText={getRandomButtonText('welcome')}
      />
    </div>
  );
}

export default HomePage;
