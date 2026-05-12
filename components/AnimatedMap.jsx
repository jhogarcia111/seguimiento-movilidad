'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para el icono del marcador en React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Componente para animar el zoom desde el planeta hasta la ubicación
function MapZoomAnimation({ targetPosition, targetZoom, onAnimationComplete, isAnimating, isLoading }) {
  const map = useMap();
  const animationRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const frozenTargetPosition = useRef(null); // Congelar posición objetivo al inicio
  const hasCompletedOnce = useRef(false); // Evitar múltiples completados

  // Mantener el ref actualizado
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Congelar targetPosition cuando se inicia la animación
  useEffect(() => {
    if (isAnimating && targetPosition && !frozenTargetPosition.current) {
      frozenTargetPosition.current = targetPosition;
    }
  }, [isAnimating, targetPosition]);

  useEffect(() => {
    if (!isAnimating) return;

    // Limpiar animación anterior si existe
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    // Usar posición congelada si está disponible, sino usar targetPosition actual, sino centro de Bogotá
    const finalTargetPosition = frozenTargetPosition.current || targetPosition || [4.6097, -74.0817];
    
    // Si no hay posición objetivo congelada y hay targetPosition, congelarla ahora
    if (!frozenTargetPosition.current && targetPosition) {
      frozenTargetPosition.current = targetPosition;
    }

    // Esperar un momento para que el mapa se renderice completamente
    const startAnimation = setTimeout(() => {
      // Animación de zoom y movimiento - más lenta para entretener al usuario (8-10 segundos)
      const duration = 8000; // 8 segundos para que dure mientras se cargan los datos
      const steps = 120; // Más frames para animación más suave
      const stepDuration = duration / steps;
      
      let step = 0;
      const startZoom = 1;
      const endZoom = targetZoom || 14;
      
      const startPosition = [4.6097, -74.0817]; // Centro de Bogotá como punto inicial
      const startLat = startPosition[0];
      const startLng = startPosition[1];
      const endLat = finalTargetPosition[0];
      const endLng = finalTargetPosition[1];

      // Iniciar desde zoom 1 (planeta)
      map.setView(startPosition, startZoom, { animate: false });

      const animate = () => {
        step++;
        
        if (step >= steps) {
          // Si aún está cargando Y no hay coordenadas objetivo congeladas, reiniciar la animación (solo una vez)
          if (isLoadingRef.current && !frozenTargetPosition.current) {
            step = 0;
            map.setView(startPosition, startZoom, { animate: false });
            // Continuar la animación
            return;
          }
          
          // Animación completa - ir a las coordenadas objetivo congeladas
          map.setView(finalTargetPosition, endZoom, { animate: false });
          
          // Solo llamar onAnimationComplete una vez
          if (!hasCompletedOnce.current) {
            hasCompletedOnce.current = true;
            if (onAnimationComplete) {
              onAnimationComplete();
            }
          }
          
          if (animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
          }
          return;
        }

        const progress = step / steps;
        // Easing function (ease-in-out)
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolar zoom
        const zoom = startZoom + (endZoom - startZoom) * eased;
        
        // Interpolar posición
        const lat = startLat + (endLat - startLat) * eased;
        const lng = startLng + (endLng - startLng) * eased;

        map.setView([lat, lng], zoom, { animate: false });
      };

      // Esperar un frame antes de comenzar la animación
      requestAnimationFrame(() => {
        animationRef.current = setInterval(animate, stepDuration);
      });
    }, 100); // Esperar 100ms para que el mapa se renderice

    return () => {
      clearTimeout(startAnimation);
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isAnimating, targetPosition, targetZoom, map, onAnimationComplete, isLoading]);
  
  // Resetear cuando la animación se detiene
  useEffect(() => {
    if (!isAnimating) {
      frozenTargetPosition.current = null;
      hasCompletedOnce.current = false;
    }
  }, [isAnimating]);

  return null;
}

// Componente para ajustar el zoom del mapa para mostrar el sector buscado y los incidentes
function MapBounds({ centerPosition, incidentPositions }) {
  const map = useMap();
  const hasAdjusted = useRef(false);

  useEffect(() => {
    if (!centerPosition || hasAdjusted.current) return;

    // Priorizar siempre el sector buscado - centrar en él primero
    map.setView(centerPosition, 15, { animate: true });
    
    // Si hay incidentes, ajustar el zoom para incluir el sector y los incidentes (pero priorizando el sector)
    if (incidentPositions && incidentPositions.length > 0) {
      // Esperar un momento para que el mapa se centre primero en el sector
      setTimeout(() => {
        const bounds = [centerPosition, ...incidentPositions];
        try {
          // Calcular bounds pero asegurarse de que el sector esté siempre visible
          const allBounds = bounds;
          map.fitBounds(allBounds, {
            padding: [50, 50], // Padding para que no quede muy pegado
            maxZoom: 15 // Limitar el zoom máximo para que siempre se vea el sector
          });
        } catch (error) {
          console.error('Error ajustando bounds:', error);
          // Si falla, centrar en el sector buscado
          map.setView(centerPosition, 15, { animate: true });
        }
        hasAdjusted.current = true;
      }, 500);
    } else {
      hasAdjusted.current = true;
    }
  }, [centerPosition, incidentPositions, map]);

  // Resetear cuando cambia el centerPosition (nueva búsqueda)
  useEffect(() => {
    hasAdjusted.current = false;
  }, [centerPosition]);

  return null;
}

// Función para calcular horas transcurridas desde el timestamp
function getHoursAgo(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  } catch {
    return null;
  }
}

// Función para crear íconos personalizados según el tipo de incidente y antigüedad
function createIncidentIcon(type, timestamp = null) {
  const iconColors = {
    'manifestación': '#ea4335',
    'accidente': '#ff5722',
    'obra': '#ff9800',
    'desvío': '#2196f3',
    'otro': '#9e9e9e'
  };

  const iconSymbols = {
    'manifestación': '🚩',
    'accidente': '💥',
    'obra': '🚧',
    'desvío': '⚠️',
    'otro': '📍'
  };

  const baseColor = iconColors[type] || iconColors['otro'];
  const symbol = iconSymbols[type] || iconSymbols['otro'];
  
  // Si el incidente tiene más de 1 hora, usar color menos llamativo (más opaco)
  const hoursAgo = getHoursAgo(timestamp);
  const isOld = hoursAgo !== null && hoursAgo > 1;
  
  // Reducir opacidad y saturación para incidentes antiguos
  const color = isOld ? adjustColorOpacity(baseColor, 0.6) : baseColor;
  const borderColor = isOld ? adjustColorOpacity(baseColor, 0.4) : 'white';

  const htmlIcon = L.divIcon({
    className: `custom-incident-marker ${isOld ? 'old-incident' : ''}`,
    html: `
      <div style="
        background-color: ${color};
        width: ${isOld ? '28px' : '32px'};
        height: ${isOld ? '28px' : '32px'};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0,0,0,${isOld ? '0.2' : '0.3'});
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        opacity: ${isOld ? '0.7' : '1'};
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${isOld ? '16px' : '18px'};
          display: block;
        ">${symbol}</span>
      </div>
    `,
    iconSize: [isOld ? 28 : 32, isOld ? 28 : 32],
    iconAnchor: [isOld ? 14 : 16, isOld ? 28 : 32],
    popupAnchor: [0, isOld ? -28 : -32]
  });

  return htmlIcon;
}

// Función para ajustar opacidad de color
function adjustColorOpacity(color, opacity) {
  // Convertir hex a rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

// Componente para marcador arrastrable del sector buscado
function DraggableSearchMarker({ position, icon, sector, coordinates, onDragEnd }) {
  const [draggedPosition, setDraggedPosition] = useState(position);
  const markerRef = useRef(null);
  
  // Actualizar posición cuando cambia la prop position (nueva búsqueda)
  useEffect(() => {
    setDraggedPosition(position);
  }, [position]);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPosition = marker.getLatLng();
          const newCoords = [newPosition.lat, newPosition.lng];
          setDraggedPosition(newCoords);
          // Llamar callback con las nuevas coordenadas
          if (onDragEnd) {
            onDragEnd({
              lat: newPosition.lat,
              lng: newPosition.lng
            });
          }
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={draggedPosition}
      icon={icon}
      ref={markerRef}
    >
      <Popup>
        <div style={{ textAlign: 'center', minWidth: '150px' }}>
          <strong style={{ color: '#ea4335', fontSize: '14px' }}>📍 {sector || 'Ubicación buscada'}</strong>
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {draggedPosition[0].toFixed(4)}, {draggedPosition[1].toFixed(4)}
          </span>
          <br />
          <span style={{ fontSize: '10px', color: '#999', fontStyle: 'italic', marginTop: '4px', display: 'block' }}>
            Arrastra para cambiar la ubicación
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

function AnimatedMap({ coordinates, sector, incidents = [], isLoading = false, onAnimationComplete, onMarkerDragEnd }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleIncidents, setVisibleIncidents] = useState([]);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [targetCoordinates, setTargetCoordinates] = useState(null); // Congelar coordenadas objetivo
  const hasStartedAnimation = useRef(false);

  // Trackear las coordenadas anteriores para detectar cambios
  const prevCoordinates = useRef(null);
  const prevIsLoading = useRef(isLoading);

  useEffect(() => {
    // Detectar cuando se inicia una nueva búsqueda (isLoading cambia de false a true)
    if (isLoading && !prevIsLoading.current) {
      // Nueva búsqueda iniciada - resetear todo
      setIsAnimating(true);
      setAnimationComplete(false);
      setVisibleIncidents([]);
      setTargetCoordinates(null);
      hasStartedAnimation.current = false;
      prevCoordinates.current = null;
    }
    // Si está cargando y aún no hemos iniciado la animación, iniciarla
    else if (isLoading && !hasStartedAnimation.current) {
      setIsAnimating(true);
      setAnimationComplete(false);
      setVisibleIncidents([]);
      hasStartedAnimation.current = true;
    } 
    // Si ya no está cargando y hay coordenadas nuevas, actualizar el objetivo
    else if (!isLoading && coordinates && coordinates.lat && coordinates.lng) {
      const coordsKey = `${coordinates.lat}-${coordinates.lng}`;
      const prevCoordsKey = prevCoordinates.current ? `${prevCoordinates.current.lat}-${prevCoordinates.current.lng}` : null;
      
      // Solo actualizar si las coordenadas son diferentes
      if (coordsKey !== prevCoordsKey) {
        // Congelar las coordenadas objetivo para que no cambien durante la animación
        setTargetCoordinates({ lat: Number(coordinates.lat), lng: Number(coordinates.lng) });
        prevCoordinates.current = { lat: Number(coordinates.lat), lng: Number(coordinates.lng) };
        
        // Si la animación no ha comenzado, iniciarla
        if (!hasStartedAnimation.current) {
          setIsAnimating(true);
          setAnimationComplete(false);
          setVisibleIncidents([]);
          hasStartedAnimation.current = true;
        }
      }
    }
    
    prevIsLoading.current = isLoading;
  }, [coordinates, isLoading]);

  const handleAnimationComplete = () => {
    // Solo completar la animación si ya no está cargando Y hay coordenadas objetivo
    if (!isLoading && targetCoordinates) {
      setIsAnimating(false);
      setAnimationComplete(true);
      hasStartedAnimation.current = true; // Marcar como completada
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      // Comenzar a mostrar incidentes progresivamente
      showIncidentsProgressively();
    }
    // Si aún está cargando, la animación continuará en el loop (pero solo una vez)
  };

  const showIncidentsProgressively = () => {
    if (!incidents || incidents.length === 0) return;

    const incidentsWithCoordinates = incidents.filter(
      incident => incident.coordinates && incident.coordinates.lat && incident.coordinates.lng
    );

    // Mostrar incidentes uno por uno con un pequeño delay
    incidentsWithCoordinates.forEach((incident, index) => {
      setTimeout(() => {
        setVisibleIncidents(prev => [...prev, incident]);
      }, index * 200); // 200ms entre cada incidente
    });
  };

  // Si no hay coordenadas pero está cargando, mostrar mapa en centro de Bogotá
  const defaultPosition = [4.6097, -74.0817]; // Centro de Bogotá
  // Usar coordenadas objetivo congeladas si están disponibles, sino usar las coordenadas actuales
  const finalCoordinates = targetCoordinates || coordinates;
  const hasCoordinates = finalCoordinates && finalCoordinates.lat && finalCoordinates.lng;
  const centerPosition = hasCoordinates
    ? [Number(finalCoordinates.lat), Number(finalCoordinates.lng)]
    : defaultPosition;
  const targetZoom = incidents.length > 0 ? 13 : 15;
  
  // Si no hay animación activa, marcar como completada inmediatamente
  useEffect(() => {
    if (!isAnimating && !animationComplete) {
      setAnimationComplete(true);
    }
  }, [isAnimating, animationComplete]);
  
  // Mostrar incidentes inmediatamente si no hay animación activa
  useEffect(() => {
    if (!isAnimating && !isLoading && incidents && incidents.length > 0) {
      const incidentsWithCoordinates = incidents.filter(
        incident => {
          // Verificar si tiene coordinates directamente
          if (incident.coordinates && incident.coordinates.lat && incident.coordinates.lng) {
            return true;
          }
          // Verificar si tiene location.coordinates
          if (incident.location && incident.location.coordinates && incident.location.coordinates.lat && incident.location.coordinates.lng) {
            // Normalizar a coordinates
            incident.coordinates = incident.location.coordinates;
            return true;
          }
          return false;
        }
      );
      console.log('🗺️ [AnimatedMap] Incidentes con coordenadas:', incidentsWithCoordinates.length, 'de', incidents.length);
      setVisibleIncidents(incidentsWithCoordinates);
    }
  }, [isAnimating, isLoading, incidents]);

  // Crear marcador rojo para la ubicación del sector buscado (arrastrable)
  const searchIcon = L.divIcon({
    className: 'custom-search-marker draggable-marker',
    html: `
      <div style="
        background-color: #ea4335;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        animation: ${isAnimating ? 'pulse 1s infinite' : 'none'};
        cursor: move;
        transition: transform 0.2s ease;
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Hace un momento';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } catch (error) {
      return timestamp;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'manifestación': 'Manifestación',
      'accidente': 'Accidente',
      'obra': 'Obra',
      'desvío': 'Desvío',
      'otro': 'Otro'
    };
    return labels[type] || 'Otro';
  };


  return (
    <div className="location-map-container" style={{ position: 'relative' }}>
      <MapContainer
        center={hasCoordinates ? centerPosition : [4.6097, -74.0817]} // Empezar desde coordenadas si hay, sino centro de Bogotá
        zoom={isAnimating ? 1 : (hasCoordinates ? targetZoom : 12)} // Empezar desde zoom 1 (planeta) si está animando
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        zoomControl={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        key={`map-${sector || 'default'}-${hasCoordinates ? `${finalCoordinates.lat}-${finalCoordinates.lng}` : 'no-coords'}`} // Usar sector y coordenadas como key
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Animación de zoom deshabilitada para mostrar resultados más rápido */}
        {/* {isAnimating && (
          <MapZoomAnimation
            targetPosition={hasCoordinates ? centerPosition : defaultPosition}
            targetZoom={hasCoordinates ? targetZoom : 12}
            isAnimating={isAnimating}
            isLoading={isLoading && !targetCoordinates}
            onAnimationComplete={handleAnimationComplete}
          />
        )} */}
        
        {/* Marcador del sector buscado (mostrar si hay coordenadas, sin esperar animación si no hay animación activa) - ARRASTRABLE */}
        {((!isAnimating && hasCoordinates) || (animationComplete && hasCoordinates)) && (
          <DraggableSearchMarker 
            position={centerPosition} 
            icon={searchIcon}
            sector={sector}
            coordinates={finalCoordinates}
            onDragEnd={onMarkerDragEnd}
          />
        )}

        {/* Ajustar zoom para mostrar el sector buscado y los incidentes (priorizando el sector) */}
        {((!isAnimating && hasCoordinates) || (animationComplete && hasCoordinates)) && (
          <MapBounds 
            centerPosition={centerPosition} 
            incidentPositions={visibleIncidents
              .filter(inc => inc.coordinates && inc.coordinates.lat && inc.coordinates.lng)
              .map(inc => [Number(inc.coordinates.lat), Number(inc.coordinates.lng)])}
          />
        )}

        {/* Marcadores de incidentes (mostrar progresivamente) */}
        {visibleIncidents.map((incident) => {
          // Obtener coordenadas del incidente (puede estar en coordinates o location.coordinates)
          const coords = incident.coordinates || (incident.location && incident.location.coordinates);
          if (!coords || !coords.lat || !coords.lng) {
            console.warn('🗺️ [AnimatedMap] Incidente sin coordenadas:', incident.id, incident.title);
            return null;
          }
          
          const incidentPosition = [Number(coords.lat), Number(coords.lng)];
          const incidentIcon = createIncidentIcon(incident.type || 'otro', incident.timestamp);
          
          // Calcular tiempo transcurrido
          const hoursAgo = getHoursAgo(incident.timestamp);
          const timeLabel = hoursAgo !== null 
            ? hoursAgo > 1 
              ? `Hace ${hoursAgo} hora${hoursAgo !== 1 ? 's' : ''}`
              : 'Hace menos de 1 hora'
            : incident.timestamp 
              ? new Date(incident.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
              : '';
          
          return (
            <Marker key={incident.id} position={incidentPosition} icon={incidentIcon}>
              <Popup>
                <div style={{ minWidth: '200px', maxWidth: '300px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '8px',
                    borderBottom: '1px solid #eee',
                    paddingBottom: '8px'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {incident.type === 'manifestación' ? '🚩' : 
                       incident.type === 'accidente' ? '💥' :
                       incident.type === 'obra' ? '🚧' :
                       incident.type === 'desvío' ? '⚠️' : '📍'}
                    </span>
                    <strong style={{ fontSize: '14px', color: '#333' }}>
                      {getTypeLabel(incident.type || 'otro')}
                    </strong>
                  </div>
                  {timeLabel && (
                    <div style={{ 
                      marginBottom: '6px', 
                      fontSize: '11px', 
                      color: hoursAgo && hoursAgo > 1 ? '#666' : '#999',
                      fontStyle: 'italic'
                    }}>
                      {timeLabel}
                    </div>
                  )}
                  <div style={{ marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px' }}>{incident.title || 'Sin título'}</strong>
                  </div>
                  {incident.description && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      margin: '6px 0',
                      lineHeight: '1.4',
                      maxHeight: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {incident.description.substring(0, 150)}
                      {incident.description.length > 150 ? '...' : ''}
                    </p>
                  )}
                  {incident.location?.name && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                      📍 {incident.location.name}
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #eee',
                    fontSize: '11px',
                    color: '#888'
                  }}>
                    <span>{formatTime(incident.timestamp)}</span>
                    {incident.url && (
                      <a 
                        href={incident.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#1a73e8', textDecoration: 'none' }}
                      >
                        Ver →
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {isLoading && !animationComplete && (
        <div className="map-loading-overlay" style={{ pointerEvents: 'none', opacity: 0.7 }}>
          <div className="map-loading-message">
            <div className="map-loading-spinner"></div>
            <p>🔍 Buscando información de movilidad...</p>
            <p className="map-loading-subtitle">Analizando datos de bogota.gov.co y redes oficiales</p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        .map-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          border-radius: 8px;
          pointer-events: none;
        }
        .map-loading-message {
          text-align: center;
          padding: 2rem;
        }
        .map-loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1a73e8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .map-loading-message p {
          margin: 0.5rem 0;
          font-size: 1rem;
          color: #333;
        }
        .map-loading-subtitle {
          font-size: 0.875rem !important;
          color: #666 !important;
        }
        .draggable-marker div {
          cursor: move !important;
        }
        .draggable-marker div:hover {
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
}

export default AnimatedMap;

