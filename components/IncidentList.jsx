'use client';

import IncidentCard from './IncidentCard';
import './IncidentList.css';

function IncidentList({ incidents, isMock = false }) {
  if (!incidents || incidents.length === 0) {
    return null;
  }

  // Agrupar por tipo de incidente
  const grouped = incidents.reduce((acc, incident) => {
    const type = incident.type || 'otro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(incident);
    return acc;
  }, {});

  return (
    <div className={`incident-list ${isMock ? 'mock-data' : ''}`}>
      {Object.entries(grouped).map(([type, typeIncidents]) => (
        <div key={type} className={`incident-group ${isMock ? 'mock-data' : ''}`}>
          <h3 className="group-title">
            {getTypeIcon(type)} {getTypeLabel(type)} ({typeIncidents.length})
          </h3>
          <div className="incidents-grid">
            {typeIncidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} isMock={isMock} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getTypeIcon(type) {
  const icons = {
    manifestación: '🚩',
    accidente: '🚨',
    obra: '🚧',
    desvío: '⚠️',
    otro: '📋'
  };
  return icons[type] || icons.otro;
}

function getTypeLabel(type) {
  const labels = {
    manifestación: 'Manifestaciones',
    accidente: 'Accidentes',
    obra: 'Obras',
    desvío: 'Desvíos',
    otro: 'Otros'
  };
  return labels[type] || 'Otros';
}

export default IncidentList;
