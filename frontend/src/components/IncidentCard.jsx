import './IncidentCard.css';

function IncidentCard({ incident, isMock = false }) {
  // Determinar si este incidente específico es mock
  // Un incidente es mock si:
  // 1. El prop isMock es true (a nivel de lista)
  // 2. El ID del incidente empieza con "mock-"
  // 3. El ID del incidente contiene "mock-" (para tweets mock)
  // 4. No tiene URL y es de twitter (los tweets reales siempre tienen URL)
  const isIncidentMock = isMock || 
    (incident.id && (incident.id.toString().includes('mock-') || incident.id.toString().startsWith('mock-'))) ||
    (incident.source === 'twitter' && !incident.url && incident.id && incident.id.toString().includes('mock-'));

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

  const getSourceIcon = (source) => {
    if (source === 'twitter') return '🐦';
    if (source === 'bogota.gov.co') return '🏛️';
    return '📋';
  };

  return (
    <div className={`incident-card ${isIncidentMock ? 'mock-data' : ''}`}>
      <div className="incident-header">
        <span className="incident-type">{incident.type || 'otro'}</span>
        <span className="incident-time">{formatTime(incident.timestamp)}</span>
      </div>
      
      <h4 className="incident-title">{incident.title?.replace(/<[^>]*>/g, '') || ''}</h4>
      
      <p className="incident-description">{incident.content || incident.description || ''}</p>
      
      {incident.location && (
        <div className="incident-location">
          📍 {incident.location.name || JSON.stringify(incident.location)}
        </div>
      )}
      
      <div className="incident-footer">
        <span className="incident-source">
          {getSourceIcon(incident.source)} {incident.source}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isIncidentMock && (
            <span className="mock-badge">📋 Datos de prueba</span>
          )}
          {incident.url && (
            <a 
              href={incident.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="incident-link"
            >
              Ver original →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentCard;
