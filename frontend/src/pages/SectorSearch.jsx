import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SectorInput from '../components/SectorInput';
import IncidentList from '../components/IncidentList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import './SectorSearch.css';

function SectorSearch() {
  const { token } = useAuth();
  const [sector, setSector] = useState('');
  const [searchQuery, setSearchQuery] = useState(null);

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

  return (
    <div className="sector-search-page">
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
  );
}

export default SectorSearch;
