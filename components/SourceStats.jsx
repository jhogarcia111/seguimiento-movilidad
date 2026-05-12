'use client';

import './SourceStats.css';

const STATUS_PILLS = {
  operational: { label: 'Operativa', cls: 'source-stat-pill-ok' },
  configuration_required: { label: 'Requiere config', cls: 'source-stat-pill-warn' },
  in_development: { label: 'En desarrollo', cls: 'source-stat-pill-dev' },
  unavailable: { label: 'No disponible', cls: 'source-stat-pill-dev' },
  disabled: { label: 'Desactivada', cls: 'source-stat-pill-off' },
};

export default function SourceStats({ stats }) {
  if (!stats) return null;
  const sources = Object.values(stats);

  return (
    <div className="source-stats">
      <h4 className="source-stats-title">📡 Fuentes consultadas</h4>
      <div className="source-stats-grid">
        {sources.map((s) => {
          const pill = STATUS_PILLS[s.status] || STATUS_PILLS.operational;
          return (
            <div
              key={s.id}
              className={`source-stat-card source-stat-${s.status}`}
              title={`${s.matched} de ${s.fetched} resultados crudos relevantes`}
            >
              <div className="source-stat-header">
                <span className="source-stat-icon" aria-hidden="true">
                  {s.icon}
                </span>
                <span className="source-stat-label">{s.label}</span>
                <span className={`source-stat-pill ${pill.cls}`}>{pill.label}</span>
              </div>
              <div className="source-stat-body">
                <span className="source-stat-matched">{s.matched}</span>
                <span className="source-stat-separator">/</span>
                <span className="source-stat-fetched">{s.fetched}</span>
                <span className="source-stat-explainer">
                  resultados relevantes / totales
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
