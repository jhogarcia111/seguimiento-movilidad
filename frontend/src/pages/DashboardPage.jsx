import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import SectorInput from '../components/SectorInput';
import IncidentList from '../components/IncidentList';
import SearchHistory from '../components/SearchHistory';
import api from '../services/api';
import './DashboardPage.css';

function DashboardPage() {
  const { user, token } = useAuth();
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
      alert('Geolocalización no está disponible');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

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
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard - {user?.username}</h1>
        <p className="welcome-text">Bienvenido al sistema de seguimiento de movilidad</p>
      </div>

      <div className="dashboard-content">
        <div className="search-section">
          <h2>🔍 Buscar Problemas de Movilidad</h2>
          <SectorInput
            value={sector}
            onChange={setSector}
            onSearch={handleSearch}
            onGeolocation={handleGeolocation}
            loading={isLoading}
          />

          {isLoading && (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Buscando información...</p>
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>⚠️ {error.message || 'Error al buscar información'}</p>
              <button onClick={refetch} className="retry-button">
                🔄 Reintentar
              </button>
            </div>
          )}

          {data && !isLoading && (
            <div className="search-results">
              <div className="results-header">
                <h3>Resultados para: <strong>{searchQuery.sector || searchQuery}</strong></h3>
                {data.results?.coordinates && (
                  <p className="coordinates">
                    📍 {data.results.coordinates.lat.toFixed(4)}, {data.results.coordinates.lng.toFixed(4)}
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
                </div>
              )}
            </div>
          )}
        </div>

        <div className="history-section">
          <SearchHistory token={token} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
