import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import IncidentList from '../components/IncidentList';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import AnimatedMap from '../components/AnimatedMap';
import SearchHistory from '../components/SearchHistory';
import './TestScraping.css';

function TestScraping() {
  const { token } = useAuth();
  const [url, setUrl] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleScrape = async (searchParams = null) => {
    const urlToScrape = searchParams?.url || url.trim();
    const queryToUse = searchParams?.userQuery || userQuery.trim();

    if (!urlToScrape) {
      setError('Por favor, ingresa una URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    // Si viene de parámetros, actualizar los campos
    if (searchParams) {
      setUrl(urlToScrape);
      setUserQuery(queryToUse || '');
    }

    try {
      const response = await api.post('/api/test/scrape', {
        url: urlToScrape,
        userQuery: queryToUse || null
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setData(response.data);
      console.log('🧪 [TEST] Resultados del scraping:', response.data);

      // Guardar en historial (usando la ruta de búsqueda normal)
      try {
        await api.post('/api/user/search', {
          sector: queryToUse || urlToScrape,
          source: 'bogota-news',
          skipCache: true,
          url: urlToScrape // Guardar URL en el historial
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (historyError) {
        console.warn('No se pudo guardar en historial:', historyError);
      }
    } catch (err) {
      console.error('🧪 [TEST] Error en scraping:', err);
      setError(err.response?.data?.message || err.message || 'Error al hacer scraping');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const incidents = data?.incidents || [];
  // Obtener coordenadas del primer incidente que tenga coordenadas
  const firstIncidentWithCoords = incidents.find(inc => inc.coordinates && inc.coordinates.lat && inc.coordinates.lng);
  const coordinates = firstIncidentWithCoords?.coordinates || null;

  return (
    <div className="test-scraping-container">
      <div className="test-scraping-main">
        <div className="test-scraping-content">
          <div className="test-scraping-header">
            <h1>🧪 Pruebas de Scraping</h1>
            <p className="test-scraping-subtitle">
              Ingresa una URL de bogota.gov.co para probar el scraping y ver cómo se extraen los incidentes
            </p>
          </div>

          <div className="test-scraping-form">
        <div className="form-group">
          <label htmlFor="url-input">URL del artículo:</label>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://bogota.gov.co/mi-ciudad/movilidad/..."
            className="url-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="query-input">
            Búsqueda del usuario (opcional):
            <span className="form-hint">Úsala para validar relevancia con IA</span>
          </label>
          <input
            id="query-input"
            type="text"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="ej: el campín, carrera séptima, parque nacional..."
            className="query-input"
          />
        </div>

        <button
          onClick={handleScrape}
          disabled={isLoading || !url.trim()}
          className="scrape-button"
        >
          {isLoading ? 'Scrapeando...' : '🔍 Hacer Scraping'}
        </button>
      </div>

      {isLoading && (
        <div className="test-scraping-loading">
          <LoadingSpinner />
          <p>Scrapeando la URL...</p>
        </div>
      )}

      {error && (
        <div className="test-scraping-error">
          <ErrorMessage message={error} />
        </div>
      )}

      {data && (
        <div className="test-scraping-results">
          <div className="results-header">
            <h2>Resultados del Scraping</h2>
            <div className="results-summary">
              <span className="summary-item">
                📊 <strong>{incidents.length}</strong> incidente{incidents.length !== 1 ? 's' : ''} encontrado{incidents.length !== 1 ? 's' : ''}
              </span>
              {data.debug && (
                <span className="summary-item">
                  📄 Tamaño del contenido: <strong>{data.debug.contentLength?.toLocaleString()}</strong> caracteres
                </span>
              )}
            </div>
          </div>

          {data.debug && (
            <div className="debug-info">
              <h3>🔍 Información de Debug</h3>
              <div className="debug-details">
                <div className="debug-item">
                  <strong>URL:</strong> {data.debug.url}
                </div>
                <div className="debug-item">
                  <strong>Status:</strong> {data.debug.status}
                </div>
                <div className="debug-item">
                  <strong>Content-Type:</strong> {data.debug.contentType}
                </div>
                <div className="debug-item">
                  <strong>Content-Length:</strong> {data.debug.contentLength?.toLocaleString()} caracteres
                </div>
                <div className="debug-item">
                  <strong>Incidentes encontrados:</strong> {data.debug.incidentsFound}
                </div>
              </div>
            </div>
          )}

          {incidents.length > 0 ? (
            <div className="test-scraping-content">
              <div className="test-scraping-incidents">
                <IncidentList incidents={incidents} isMock={false} />
              </div>
              
              {incidents.length > 0 && (
                <div className="test-scraping-map">
                  <AnimatedMap
                    coordinates={coordinates || { lat: 4.6097, lng: -74.0817 }} // Coordenadas por defecto de Bogotá
                    sector={userQuery || 'Ubicación del incidente'}
                    incidents={incidents}
                    isLoading={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="test-scraping-no-results">
              <p>⚠️ No se encontraron incidentes en esta URL.</p>
              <p className="hint">
                Esto puede deberse a:
                <ul>
                  <li>La URL no contiene información de movilidad</li>
                  <li>El formato del artículo no es reconocido</li>
                  <li>No hay ubicaciones relevantes para la búsqueda (si se proporcionó)</li>
                </ul>
              </p>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
      
      <div className="test-scraping-sidebar">
        <SearchHistory onSearch={handleScrape} />
      </div>
    </div>
  );
}

export default TestScraping;

