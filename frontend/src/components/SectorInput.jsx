import './SectorInput.css';

function SectorInput({ value, onChange, onSearch, onGeolocation, loading }) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch();
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
          onClick={onSearch}
          disabled={loading || !value.trim()}
          className="search-button"
        >
          {loading ? '⏳' : '🔍'}
        </button>
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
