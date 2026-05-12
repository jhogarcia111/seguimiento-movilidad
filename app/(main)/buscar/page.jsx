'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoContext } from '@/contexts/VideoContext';
import api from '@/services/api';
import SectorInput from '@/components/SectorInput';
import IncidentList from '@/components/IncidentList';
import ErrorMessage from '@/components/ErrorMessage';
import TitoModal from '@/components/TitoModal';
import ConfirmModal from '@/components/ConfirmModal';
import useTitoModal from '@/hooks/useTitoModal';
import { Volume2, VolumeX } from 'lucide-react';
import '@/styles/SectorSearch.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false });
const AnimatedMap = dynamic(() => import('@/components/AnimatedMap'), { ssr: false });

function SectorSearchInner() {
  const { token } = useAuth();
  const [sector, setSector] = useState('');
  const [searchQuery, setSearchQuery] = useState(null);
  const { registerPageVideo, unregisterPageVideo } = useVideoContext();
  // Inicializar consistente para SSR; sincronizar con sessionStorage en useEffect.
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [showSplitLayout, setShowSplitLayout] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const { getRandomMessage, getRandomVideo, getRandomButtonText } = useTitoModal();
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

  // Registrar el video embebido en el contexto de videos
  useEffect(() => {
    if (videoRef.current) {
      registerPageVideo(videoRef);
      return () => {
        unregisterPageVideo(videoRef);
      };
    }
  }, [registerPageVideo, unregisterPageVideo, videoRef]);

  // Verificar si ya se mostró el modal en esta sesión (usando useEffect como fallback)
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

  const [selectedSource, setSelectedSource] = useState('all');
  const [useCache, setUseCache] = useState(false);

  // Estado para resultados en tiempo real
  const [streamingData, setStreamingData] = useState(null);
  const [streamingIncidents, setStreamingIncidents] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef(null);

  // Usar streaming en tiempo real cuando hay búsqueda
  useEffect(() => {
    if (!searchQuery || !token) {
      return;
    }

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Resetear estado
    setStreamingData(null);
    setStreamingIncidents([]);
    setIsStreaming(true);

    // Preparar parámetros
    const params = typeof searchQuery === 'object' 
      ? { sector: searchQuery.sector, lat: searchQuery.lat, lng: searchQuery.lng, source: selectedSource, skipCache: !useCache, stream: true }
      : { sector: searchQuery, source: selectedSource, skipCache: !useCache, stream: true };

    // En el monorepo todo vive en el mismo dominio: ruta relativa.
    const url = '/api/user/search';

    // Crear EventSource con autenticación en headers (usando fetch + ReadableStream)
    const controller = new AbortController();
    const signal = controller.signal;

    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(params),
      signal
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.body;
      })
      .then(body => {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              setIsStreaming(false);
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.type === 'start') {
                    console.log('📡 Iniciando búsqueda en tiempo real...');
                  } else if (data.type === 'incident') {
                    console.log('📦 Incidente recibido:', data.incident);
                    setStreamingIncidents(prev => {
                      // Evitar duplicados
                      if (prev.some(inc => inc.id === data.incident.id)) {
                        return prev;
                      }
                      return [...prev, data.incident];
                    });
                  } else if (data.type === 'progress') {
                    console.log('📊 Progreso:', data);
                  } else if (data.type === 'complete') {
                    console.log('✅ Búsqueda completada:', data.results);
                    // Usar función de actualización para obtener el valor más reciente de streamingIncidents
                    setStreamingIncidents(prevIncidents => {
                      const finalIncidents = prevIncidents.length > 0 ? prevIncidents : (data.results?.incidents || []);
                      setStreamingData({
                        success: true,
                        results: {
                          ...data.results,
                          incidents: finalIncidents
                        }
                      });
                      return prevIncidents;
                    });
                    setIsStreaming(false);
                  } else if (data.type === 'error') {
                    console.error('❌ Error en búsqueda:', data.error);
                    setIsStreaming(false);
                  }
                } catch (error) {
                  console.error('Error parseando evento SSE:', error);
                }
              }
            }

            processStream();
          }).catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Error leyendo stream:', error);
              setIsStreaming(false);
            }
          });
        };

        processStream();
        eventSourceRef.current = { controller, reader };
      })
      .catch(error => {
        if (error.name !== 'AbortError') {
          console.error('Error iniciando stream:', error);
          setIsStreaming(false);
          // Mostrar error al usuario
          setStreamingData({
            success: false,
            error: error.message || 'Error al iniciar la búsqueda'
          });
        }
      });

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.controller.abort();
        if (eventSourceRef.current.reader) {
          eventSourceRef.current.reader.cancel();
        }
        eventSourceRef.current = null;
      }
    };
  }, [searchQuery, selectedSource, useCache, token]);

  // Usar datos de streaming si están disponibles, sino usar query tradicional
  // Combinar incidentes de streaming con los del resultado final
  const data = streamingData ? {
    ...streamingData,
    results: {
      ...streamingData.results,
      incidents: streamingIncidents.length > 0 ? streamingIncidents : (streamingData.results?.incidents || [])
    }
  } : null;
  
  // Debug: Log para verificar datos
  useEffect(() => {
    if (data?.results?.incidents) {
      console.log('🗺️ [MAP] Incidentes para mapa:', data.results.incidents.length);
      console.log('🗺️ [MAP] Incidentes con coordenadas:', data.results.incidents.filter(inc => inc.coordinates && inc.coordinates.lat && inc.coordinates.lng).length);
      console.log('🗺️ [MAP] Coordenadas del sector:', data.results.coordinates);
    }
  }, [data]);
  const isLoading = isStreaming;
  const error = null; // Manejar errores en el stream


  const handleSearch = (source = selectedSource, cache = useCache) => {
    if (sector.trim()) {
      setSelectedSource(source);
      setUseCache(cache);
      setSearchQuery(sector.trim());
    }
  };
  
  const handleSourceChange = (source) => {
    setSelectedSource(source);
  };
  
  const handleCacheChange = (cache) => {
    setUseCache(cache);
  };

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      setAlertModal({
        isOpen: true,
        title: 'Geolocalización no disponible',
        message: 'Geolocalización no está disponible en tu navegador. Por favor, ingresa el sector manualmente.'
      });
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
      setAlertModal({
        isOpen: true,
        title: 'Error obteniendo ubicación',
        message: `Error obteniendo ubicación: ${error.message}. Por favor, intenta nuevamente o ingresa el sector manualmente.`
      });
    }
  };

  // Manejar cuando el usuario arrastra el marcador en el mapa
  const handleMarkerDragEnd = (newCoordinates) => {
    // Obtener el sector actual (si es un objeto, usar el sector; si es string, usar el string)
    const currentSector = typeof searchQuery === 'object' 
      ? searchQuery.sector 
      : searchQuery || sector;
    
    // Realizar una nueva búsqueda con las nuevas coordenadas
    setSearchQuery({
      sector: currentSector,
      lat: newCoordinates.lat,
      lng: newCoordinates.lng
    });
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
        {/* Sección de video - Ocultar cuando hay búsqueda activa (isLoading o data) */}
        {!isLoading && !data && (
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
        )}

        {/* Sección de búsqueda y resultados */}
        <div className={`search-content-section ${(isLoading || data) && searchQuery ? 'has-results' : ''}`}>
          {/* Mostrar búsqueda arriba solo cuando NO hay búsqueda activa */}
          {!(isLoading || data) && !searchQuery && (
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
                selectedSource={selectedSource}
                onSourceChange={handleSourceChange}
                useCache={useCache}
                onCacheChange={handleCacheChange}
              />
            </div>
          )}

          {/* Layout dividido cuando hay búsqueda activa */}
          {(isLoading || data) && searchQuery ? (
            <>
              <div className="results-split-layout">
                {/* Lado izquierdo: Búsqueda + Textos y resultados */}
                <div className="results-text-section">
                  {/* Búsqueda compacta en la columna izquierda */}
                  <div className="search-container-compact">
                    <h2>🔍 Buscar Problemas de Movilidad</h2>
                    <SectorInput
                      value={sector}
                      onChange={setSector}
                      onSearch={handleSearch}
                      onGeolocation={handleGeolocation}
                      loading={isLoading}
                      selectedSource={selectedSource}
                      onSourceChange={handleSourceChange}
                      useCache={useCache}
                      onCacheChange={handleCacheChange}
                    />
                  </div>

                  <div className="results-container">
                    {error && (
                      <ErrorMessage 
                        message={error.message || 'Error al buscar información'}
                        onRetry={refetch}
                      />
                    )}

                    <div className="results">
                      <div className="results-header">
                        <h2>
                          Resultados para: <strong>{typeof searchQuery === 'object' ? searchQuery.sector : searchQuery}</strong>
                        </h2>
                        
                        {data?.results?.coordinates && (
                          <p className="coordinates">
                            📍 {Number(data.results.coordinates.lat).toFixed(4)}, {Number(data.results.coordinates.lng).toFixed(4)}
                          </p>
                        )}
                        
                        {data?.results?.source && (
                          <p className="source">
                            Fuente: <span className="source-badge">{data.results.source}</span>
                          </p>
                        )}
                      </div>

                      {isLoading && !data && (
                        <div className="searching-message">
                          <div className="searching-spinner"></div>
                          <p>🔍 Buscando información de movilidad...</p>
                          <p className="searching-subtitle">Analizando datos de bogota.gov.co y redes oficiales</p>
                        </div>
                      )}

                      {data && !isLoading && (
                        <>
                          {/* Debug: Mostrar información de la respuesta */}
                          {process.env.NODE_ENV === 'development' && (
                            <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '10px', fontSize: '12px' }}>
                              <strong>Debug:</strong> 
                              <br />Has data: {data ? 'Sí' : 'No'}
                              <br />Has results: {data?.results ? 'Sí' : 'No'}
                              <br />Incidents: {data?.results?.incidents?.length || 0}
                              <br />Is array: {Array.isArray(data?.results?.incidents) ? 'Sí' : 'No'}
                              <br />Is mock: {data?.results?.isMock ? 'Sí' : 'No'}
                            </div>
                          )}
                          
                          {!data?.results?.incidents || data.results.incidents.length === 0 ? (
                            <div className={`no-results ${data.results?.isMock ? 'mock-data' : ''}`}>
                              {!data.results?.isMock ? (
                                // Mostrar video y mensaje de "caminos libres" cuando no hay incidentes y no es mock
                                <div className="no-results-content">
                                  <div className="no-results-text">
                                    <h2>📊 Resultados de Búsqueda</h2>
                                    <p className="section-subtitle">
                                      Resultados de la búsqueda para: <strong>{typeof searchQuery === 'object' ? searchQuery.sector : searchQuery}</strong>
                                    </p>
                                    <div className="no-results-message-container">
                                      <p className="no-results-message">{getRandomMessage('clear')}</p>
                                      <p className="no-results-note">
                                        Todo está normal. Si hay tráfico, puede ser por flujo normal de vehículos.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="no-results-video-section">
                                    <video
                                      className="no-results-video"
                                      loop
                                      autoPlay
                                      playsInline
                                      muted
                                      onLoadedData={(e) => {
                                        e.target.play().catch(console.error);
                                      }}
                                    >
                                      <source src={clearPathVideo} type="video/mp4" />
                                      Tu navegador no soporta videos.
                                    </video>
                                  </div>
                                </div>
                              ) : (
                                // Mostrar mensaje simple cuando es mock data
                                <>
                                  <p>
                                    ✅ No se encontraron problemas de movilidad en este sector
                                    <span className="mock-badge">📋 Datos de ejemplo</span>
                                  </p>
                                  <p className="no-results-note">
                                    No se pudo conectar con las fuentes de datos o se alcanzó el límite de la API. Se muestran datos de ejemplo.
                                  </p>
                                </>
                              )}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Mapa interactivo */}
                <div className="results-map-section">
                  {(isLoading || data?.results?.coordinates) && (
                    <AnimatedMap 
                      coordinates={data?.results?.coordinates || null} 
                      sector={typeof searchQuery === 'object' ? searchQuery.sector : searchQuery}
                      incidents={data?.results?.incidents || []}
                      isLoading={isLoading}
                      onMarkerDragEnd={handleMarkerDragEnd}
                    />
                  )}
                </div>
              </div>

              {/* Cajas de incidentes debajo de ambas columnas (full width) */}
              {data?.results?.incidents && Array.isArray(data.results.incidents) && data.results.incidents.length > 0 && (
                <div className="incidents-full-width">
                  <div className={`incident-count ${data.results.isMock ? 'mock-data' : ''}`}>
                    {data.results.incidents.length} incidente{data.results.incidents.length !== 1 ? 's' : ''} encontrado{data.results.incidents.length !== 1 ? 's' : ''}
                    {data.results.isMock && (
                      <span className="mock-badge">📋 Datos de ejemplo</span>
                    )}
                  </div>
                  <IncidentList incidents={data.results.incidents} isMock={data.results.isMock} />
                </div>
              )}
              
              {/* Debug: Mostrar si hay datos pero no se muestran */}
              {data && !isLoading && data?.results && (
                <>
                  {(!data.results.incidents || !Array.isArray(data.results.incidents) || data.results.incidents.length === 0) && (
                    <div style={{ padding: '20px', background: '#fff3cd', margin: '20px', borderRadius: '8px', border: '1px solid #ffc107' }}>
                      <p><strong>⚠️ Debug Info:</strong></p>
                      <p>Data existe: {data ? 'Sí' : 'No'}</p>
                      <p>Results existe: {data.results ? 'Sí' : 'No'}</p>
                      <p>Incidents existe: {data.results?.incidents ? 'Sí' : 'No'}</p>
                      <p>Es array: {Array.isArray(data.results?.incidents) ? 'Sí' : 'No'}</p>
                      <p>Cantidad: {data.results?.incidents?.length || 0}</p>
                      <p>Source: {data.results?.source || 'N/A'}</p>
                      <p>Is Mock: {data.results?.isMock ? 'Sí' : 'No'}</p>
                      <details style={{ marginTop: '10px' }}>
                        <summary>Ver respuesta completa</summary>
                        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', maxHeight: '300px' }}>
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="results-container">
              {!data && !isLoading && !error && (
                <div className="empty-state">
                  <p>🔍 Busca un sector para ver problemas de movilidad</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type="info"
        confirmText="Entendido"
        cancelText={null}
      />
    </div>
  );
}

export default function SectorSearchPage() {
  return (
    <ProtectedRoute>
      <SectorSearchInner />
    </ProtectedRoute>
  );
}
