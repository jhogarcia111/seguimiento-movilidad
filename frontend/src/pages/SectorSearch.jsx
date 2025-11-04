import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SectorInput from '../components/SectorInput';
import IncidentList from '../components/IncidentList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import TitoModal from '../components/TitoModal';
import useTitoModal from '../hooks/useTitoModal';
import { Volume2, VolumeX } from 'lucide-react';
import './SectorSearch.css';

function SectorSearch() {
  const { token } = useAuth();
  const [sector, setSector] = useState('');
  const [searchQuery, setSearchQuery] = useState(null);
  const [showInitialModal, setShowInitialModal] = useState(true);
  const [showSplitLayout, setShowSplitLayout] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const { getRandomMessage, getRandomVideo, getRandomButtonText } = useTitoModal();

  // Verificar si ya se mostró el modal en esta sesión
  useEffect(() => {
    const hasShownModal = sessionStorage.getItem('hasShownSearchTitoModal');
    if (!hasShownModal) {
      setShowInitialModal(true);
      setShowSplitLayout(false);
    } else {
      setShowInitialModal(false);
      setShowSplitLayout(true);
    }
  }, []);

  // Manejar confirmación del modal inicial
  const handleInitialModalConfirm = () => {
    setShowInitialModal(false);
    setShowSplitLayout(true);
    sessionStorage.setItem('hasShownSearchTitoModal', 'true');
  };

  // Manejar mute del video embebido
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Obtener videos aleatorios para el layout dividido
  const embeddedVideoPath = getRandomVideo('searching');
  const clearPathVideo = getRandomVideo('clear');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      
      const params = typeof searchQuery === 'object' 
        ? { sector: searchQuery.sector, lat: searchQuery.lat, lng: searchQuery.lng }
        : { sector: searchQuery };
      
      const response = await api.post('/api/user/search', params, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data;
    },
    enabled: !!searchQuery && !!token,
    staleTime: 0 // Siempre buscar datos frescos
  });

  const handleSearch = () => {
    if (sector.trim()) {
      setSearchQuery(sector.trim());
    }
  };

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no está disponible en tu navegador');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Usar coordenadas para buscar
      setSearchQuery({
        sector: 'Mi Ubicación',
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch (error) {
      alert('Error obteniendo ubicación: ' + error.message);
    }
  };

  // Si no se ha mostrado el layout dividido, mostrar solo el modal
  if (!showSplitLayout) {
    return (
      <TitoModal
        isOpen={showInitialModal}
        onClose={handleInitialModalConfirm} // El botón X también ejecuta la confirmación
        onConfirm={handleInitialModalConfirm}
        module="searching"
        videoPath={getRandomVideo('searching')}
        message={getRandomMessage('searching')}
        title="¡Prepárate para buscar! 🔍"
        confirmButtonText={getRandomButtonText('searching')}
      />
    );
  }

  return (
    <div className="sector-search-page">
      <div className="search-split-layout">
        {/* Sección de video */}
        <div className="search-video-section">
          <video
            ref={videoRef}
            className="search-video"
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
            <source src={embeddedVideoPath} type="video/mp4" />
            Tu navegador no soporta videos.
          </video>
          
          {/* Botón de mute siempre visible en la izquierda */}
          <button
            onClick={toggleMute}
            className="search-mute-button"
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? (
              <VolumeX className="search-mute-icon" />
            ) : (
              <Volume2 className="search-mute-icon" />
            )}
          </button>
        </div>

        {/* Sección de búsqueda y resultados */}
        <div className="search-content-section">
          <div className="search-container">
            <h1>🔍 Buscar Problemas de Movilidad</h1>
            <p className="search-instructions">
              Ingresa el nombre del sector o vía (ej: "Avenida Boyacá", "Calle 72")
            </p>

            <SectorInput
              value={sector}
              onChange={setSector}
              onSearch={handleSearch}
              onGeolocation={handleGeolocation}
              loading={isLoading}
            />
          </div>

          <div className="results-container">
            {isLoading && <LoadingSpinner />}
            
            {error && (
              <ErrorMessage 
                message={error.message || 'Error al buscar información'}
                onRetry={refetch}
              />
            )}

            {data && !isLoading && (
              <div className="results">
                <div className="results-header">
                  <h2>
                    Resultados para: <strong>{typeof searchQuery === 'object' ? searchQuery.sector : searchQuery}</strong>
                  </h2>
                  {data.results?.coordinates && (
                    <p className="coordinates">
                      📍 {Number(data.results.coordinates.lat).toFixed(4)}, {Number(data.results.coordinates.lng).toFixed(4)}
                    </p>
                  )}
                  {data.results?.source && (
                    <p className="source">
                      Fuente: <span className="source-badge">{data.results.source}</span>
                    </p>
                  )}
                </div>

                {data.results?.incidents && data.results.incidents.length > 0 ? (
                  <>
                    <div className="incident-count">
                      {data.results.incidents.length} incidente{data.results.incidents.length !== 1 ? 's' : ''} encontrado{data.results.incidents.length !== 1 ? 's' : ''}
                    </div>
                    <IncidentList incidents={data.results.incidents} />
                  </>
                ) : (
                  <div className="no-results">
                    <div className="no-results-video-container">
                      <video
                        className="no-results-video"
                        loop
                        autoPlay
                        playsInline
                        muted={isMuted}
                        onLoadedData={(e) => {
                          // Intentar reproducir con sonido habilitado
                          e.target.muted = false;
                          e.target.play().catch((error) => {
                            // Si falla, reproducir sin sonido
                            console.log('Error al reproducir con sonido, intentando sin sonido:', error);
                            e.target.muted = true;
                            e.target.play().catch(console.error);
                          });
                        }}
                      >
                        <source src={clearPathVideo} type="video/mp4" />
                        Tu navegador no soporta videos.
                      </video>
                      <button
                        onClick={toggleMute}
                        className="no-results-mute-button"
                        aria-label={isMuted ? "Activar sonido" : "Silenciar"}
                      >
                        {isMuted ? (
                          <VolumeX className="no-results-mute-icon" />
                        ) : (
                          <Volume2 className="no-results-mute-icon" />
                        )}
                      </button>
                    </div>
                    <p>✅ No se encontraron problemas de movilidad en este sector</p>
                    <p className="no-results-note">
                      Todo está normal. Si hay tráfico, puede ser por flujo normal de vehículos.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!data && !isLoading && !error && (
              <div className="empty-state">
                <p>🔍 Busca un sector para ver problemas de movilidad</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SectorSearch;
