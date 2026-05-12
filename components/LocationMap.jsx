'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para el icono del marcador en React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

// Función para crear íconos personalizados según el tipo de incidente y antigüedad
function createIncidentIcon(type, timestamp = null) {
  const iconColors = {
    'manifestación': '#ea4335', // Rojo
    'accidente': '#ff5722', // Naranja rojizo
    'obra': '#ff9800', // Naranja
    'desvío': '#2196f3', // Azul
    'otro': '#9e9e9e' // Gris
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

  // Crear un ícono HTML personalizado
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

// Componente para ajustar el zoom automáticamente
function MapBounds({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
    }
  }, [bounds, map]);

  return null;
}

function LocationMap({ coordinates, sector, incidents = [] }) {
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    return null;
  }

  const centerPosition = [Number(coordinates.lat), Number(coordinates.lng)];
  
  // Crear marcador rojo para la ubicación del sector buscado
  const searchIcon = L.divIcon({
    className: 'custom-search-marker',
    html: `
      <div style="
        background-color: #ea4335;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });

  // Filtrar incidentes que tengan coordenadas
  const incidentsWithCoordinates = incidents.filter(
    incident => incident.coordinates && incident.coordinates.lat && incident.coordinates.lng
  );

  // Calcular bounds para ajustar el zoom
  const bounds = [];
  bounds.push(centerPosition);
  incidentsWithCoordinates.forEach(incident => {
    bounds.push([Number(incident.coordinates.lat), Number(incident.coordinates.lng)]);
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
    <div className="location-map-container">
      <MapContainer
        center={centerPosition}
        zoom={bounds.length > 1 ? 13 : 15}
        style={{ height: '300px', width: '100%', borderRadius: '8px' }}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Marcador del sector buscado */}
        <Marker position={centerPosition} icon={searchIcon}>
          <Popup>
            <div style={{ textAlign: 'center', minWidth: '150px' }}>
              <strong style={{ color: '#ea4335', fontSize: '14px' }}>📍 {sector || 'Ubicación buscada'}</strong>
              <br />
              <span style={{ fontSize: '12px', color: '#666' }}>
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Marcadores de incidentes */}
        {incidentsWithCoordinates.map((incident) => {
          const incidentPosition = [Number(incident.coordinates.lat), Number(incident.coordinates.lng)];
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

        {/* Ajustar zoom para mostrar todos los marcadores */}
        {bounds.length > 1 && <MapBounds bounds={bounds} />}
      </MapContainer>
    </div>
  );
}

export default LocationMap;

