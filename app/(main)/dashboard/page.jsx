'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import SectorInput from '@/components/SectorInput';
import IncidentList from '@/components/IncidentList';
import SearchHistory from '@/components/SearchHistory';
import ConfirmModal from '@/components/ConfirmModal';
import IncidentSkeletonGrid from '@/components/SkeletonCard';
import api from '@/services/api';
import '@/styles/DashboardPage.css';

const LocationMap = dynamic(() => import('@/components/LocationMap'), {
  ssr: false,
});

function DashboardPageInner() {
  const { user, token } = useAuth();
  const [sector, setSector] = useState('');
  const [searchQuery, setSearchQuery] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [useCache, setUseCache] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: '' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-search', searchQuery, selectedSource, useCache],
    queryFn: async () => {
      if (!searchQuery) return null;
      const params =
        typeof searchQuery === 'object'
          ? {
              sector: searchQuery.sector,
              lat: searchQuery.lat,
              lng: searchQuery.lng,
              source: selectedSource,
              skipCache: !useCache,
            }
          : { sector: searchQuery, source: selectedSource, skipCache: !useCache };
      const response = await api.post('/api/user/search', params);
      return response.data;
    },
    enabled: !!searchQuery && !!token,
    staleTime: 0,
  });

  const handleSearch = (source = selectedSource, cache = useCache) => {
    if (sector.trim()) {
      setSelectedSource(source);
      setUseCache(cache);
      setSearchQuery(sector.trim());
    }
  };

  const handleSourceChange = (source) => setSelectedSource(source);
  const handleCacheChange = (cache) => setUseCache(cache);

  const handleGeolocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setAlertModal({
        isOpen: true,
        title: 'Geolocalización no disponible',
        message:
          'Geolocalización no está disponible en tu navegador. Por favor, ingresa el sector manualmente.',
      });
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setSearchQuery({
        sector: 'Mi Ubicación',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Error obteniendo ubicación',
        message: `Error obteniendo ubicación: ${err.message}. Por favor, intenta nuevamente o ingresa el sector manualmente.`,
      });
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
            selectedSource={selectedSource}
            onSourceChange={handleSourceChange}
            useCache={useCache}
            onCacheChange={handleCacheChange}
          />

          {isLoading && (
            <>
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Buscando información...</p>
              </div>
              <IncidentSkeletonGrid count={4} />
            </>
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
                <h3>
                  Resultados para:{' '}
                  <strong>{searchQuery.sector || searchQuery}</strong>
                </h3>
                {data.results?.coordinates && (
                  <>
                    <p className="coordinates">
                      📍 {data.results.coordinates.lat.toFixed(4)},{' '}
                      {data.results.coordinates.lng.toFixed(4)}
                    </p>
                    <LocationMap
                      coordinates={data.results.coordinates}
                      sector={searchQuery.sector || searchQuery}
                      incidents={data.results.incidents || []}
                    />
                  </>
                )}
              </div>

              {data.results?.incidents && data.results.incidents.length > 0 ? (
                <>
                  <div className={`incident-count ${data.results.isMock ? 'mock-data' : ''}`}>
                    {data.results.incidents.length} incidente
                    {data.results.incidents.length !== 1 ? 's' : ''} encontrado
                    {data.results.incidents.length !== 1 ? 's' : ''}
                    {data.results.isMock && (
                      <span className="mock-badge">📋 Datos de ejemplo</span>
                    )}
                  </div>
                  <IncidentList
                    incidents={data.results.incidents}
                    isMock={data.results.isMock}
                  />
                </>
              ) : (
                <div className={`no-results ${data.results?.isMock ? 'mock-data' : ''}`}>
                  <p>
                    ✅ No se encontraron problemas de movilidad en este sector
                    {data.results?.isMock && (
                      <span className="mock-badge">📋 Datos de ejemplo</span>
                    )}
                  </p>
                  {data.results?.isMock && (
                    <p className="no-results-note">
                      No se pudo conectar con las fuentes de datos o se alcanzó el límite de la
                      API. Se muestran datos de ejemplo.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="history-section">
          <SearchHistory token={token} />
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPageInner />
    </ProtectedRoute>
  );
}
