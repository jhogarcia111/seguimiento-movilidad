import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import './SearchHistory.css';

function SearchHistory({ token }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-searches'],
    queryFn: async () => {
      const response = await api.get('/api/user/searches?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="search-history">
        <h2>Historial de Búsquedas</h2>
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-history">
        <h2>Historial de Búsquedas</h2>
        <p className="error">Error al cargar historial</p>
      </div>
    );
  }

  return (
    <div className="search-history">
      <h2>📋 Historial de Búsquedas</h2>
      
      {data?.searches && data.searches.length > 0 ? (
        <div className="history-list">
          {data.searches.map((search) => (
            <div key={search.id} className="history-item">
              <div className="history-header">
                <span className="history-sector">{search.sector}</span>
                <span className="history-count">{search.results_count} resultados</span>
              </div>
              <div className="history-meta">
                <span className="history-date">{formatDate(search.search_date)}</span>
                {search.latitude && search.longitude && (
                  <span className="history-coords">
                    📍 {Number(search.latitude).toFixed(4)}, {Number(search.longitude).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-history">No hay búsquedas realizadas aún</p>
      )}
    </div>
  );
}

export default SearchHistory;
