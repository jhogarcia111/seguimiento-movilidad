'use client';

import { useState, useEffect } from 'react';
import './SectorInput.css';

function SectorInput({ value, onChange, onSearch, onGeolocation, loading, selectedSource, onSourceChange, useCache, onCacheChange }) {
  const [localSelectedSource, setLocalSelectedSource] = useState(
    selectedSource === 'waze' ? 'all' : (selectedSource || 'all')
  );
  const [localUseCache, setLocalUseCache] = useState(useCache !== undefined ? useCache : false);
  
  // Sincronizar con el prop selectedSource cuando cambia (Waze desactivado → forzar "todas")
  useEffect(() => {
    if (selectedSource === 'waze') {
      setLocalSelectedSource('all');
      if (onSourceChange) onSourceChange('all');
    } else if (selectedSource !== undefined) {
      setLocalSelectedSource(selectedSource);
    }
  }, [selectedSource, onSourceChange]);
  
  // Sincronizar con el prop useCache cuando cambia
  useEffect(() => {
    if (useCache !== undefined) {
      setLocalUseCache(useCache);
    }
  }, [useCache]);
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(localSelectedSource, localUseCache);
    }
  };

  const handleSearch = () => {
    if (value.trim()) {
      onSearch(localSelectedSource, localUseCache);
    }
  };
  
  const handleCacheToggle = (e) => {
    const newValue = e.target.checked;
    setLocalUseCache(newValue);
    if (onCacheChange) {
      onCacheChange(newValue);
    }
  };

  const handleSourceClick = (source) => {
    setLocalSelectedSource(source);
    if (onSourceChange) {
      onSourceChange(source);
    }
  };

  return (
    <div className="sector-input">
      <div className="input-group">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ej: Avenida Boyacá, Calle 72..."
          className="search-input"
          disabled={loading}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !value.trim()}
          className="search-button"
          title={localSelectedSource === 'all' ? 'Buscar en todas las fuentes' : `Buscar solo en ${localSelectedSource}`}
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </div>
      
      {/* Botones de fuente específica */}
      <div className="source-buttons">
        <div className="source-buttons-label">Buscar en:</div>
        <div className="source-buttons-group">
          <button
            onClick={() => handleSourceClick('all')}
            className={`source-button ${localSelectedSource === 'all' ? 'active' : ''}`}
            disabled={loading}
            title="Buscar en todas las fuentes"
          >
            🌐 Todas
          </button>
          <button
            onClick={() => handleSourceClick('twitter')}
            className={`source-button ${localSelectedSource === 'twitter' ? 'active' : ''}`}
            disabled={loading}
            title="Buscar solo en Twitter"
          >
            🐦 Twitter
          </button>
          <button
            onClick={() => handleSourceClick('bogota-news')}
            className={`source-button ${localSelectedSource === 'bogota-news' ? 'active' : ''}`}
            disabled={loading}
            title="Buscar solo en blogposts de bogota.gov.co"
          >
            📰 Bogotá News
          </button>
        </div>
      </div>
      
      {/* Checkbox para activar/desactivar caché */}
      <div className="cache-control">
        <label className="cache-checkbox-label">
          <input
            type="checkbox"
            checked={localUseCache}
            onChange={handleCacheToggle}
            disabled={loading}
            className="cache-checkbox"
          />
          <span className="cache-checkbox-text">
            💾 Usar caché y base de datos
          </span>
        </label>
        <span className="cache-hint">
          (Desactivar para pruebas directas de fuentes)
        </span>
      </div>
      
      <div className="input-actions">
        <button
          onClick={onGeolocation}
          className="geolocation-button"
          disabled={loading}
          title="Usar mi ubicación actual"
        >
          📍 Usar Mi Ubicación
        </button>
      </div>
    </div>
  );
}

export default SectorInput;
