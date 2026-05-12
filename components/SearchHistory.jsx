'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './SearchHistory.css';

function SearchHistory({ onSearch }) {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/user/searches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.searches) {
        // Filtrar solo búsquedas de test scraping (que tienen URL)
        const testSearches = response.data.searches
          .filter(search => search.url || search.sector)
          .slice(0, 20); // Últimas 20 búsquedas
        setHistory(testSearches);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRebuscar = (search) => {
    if (onSearch) {
      onSearch({
        url: search.url || null,
        userQuery: search.sector || null,
        source: search.source || 'all',
        skipCache: true
      });
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Hace ${diffDays} d`;
      
      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="search-history">
        <h3>📋 Historial de Búsquedas</h3>
        <p>Cargando...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="search-history">
        <h3>📋 Historial de Búsquedas</h3>
        <p className="empty-history">No hay búsquedas recientes</p>
      </div>
    );
  }

  return (
    <div className="search-history">
      <div className="search-history-header">
        <h3>📋 Historial de Búsquedas</h3>
        <button onClick={loadHistory} className="refresh-button" title="Actualizar">
          🔄
        </button>
      </div>
      
      <div className="search-history-list">
        {history.map((search) => (
          <div key={search.id} className="search-history-item">
            <div className="search-history-content">
              {search.url && (
                <div className="search-history-url">
                  <strong>URL:</strong> {truncateText(search.url, 60)}
                </div>
              )}
              {search.sector && (
                <div className="search-history-sector">
                  <strong>Búsqueda:</strong> {search.sector}
                </div>
              )}
              <div className="search-history-meta">
                <span className="search-history-time">{formatDate(search.created_at || search.search_date)}</span>
                {search.results_count !== undefined && search.results_count !== null && (
                  <span className="search-history-results">
                    {search.results_count} resultado{search.results_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleRebuscar(search)}
              className="rebuscar-button"
              title="Rebuscar"
            >
              🔍 REBUSCAR
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchHistory;
