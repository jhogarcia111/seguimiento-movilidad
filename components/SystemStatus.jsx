'use client';

import { useQuery } from '@tanstack/react-query';
import { getSourcesStatus } from '@/services/api';
import './SystemStatus.css';

const STATUS_LABELS = {
  operational: 'Operativa',
  configuration_required: 'Requiere config',
  in_development: 'En desarrollo',
  unavailable: 'No disponible',
  disabled: 'Desactivada',
};

const STATUS_ICONS = {
  operational: '🟢',
  configuration_required: '🟡',
  in_development: '🔴',
  unavailable: '🔴',
  disabled: '⚪',
};

function StatusBadge({ status, label }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-badge-dot" aria-hidden="true">
        {STATUS_ICONS[status] || '⚪'}
      </span>
      <span className="status-badge-text">{label || STATUS_LABELS[status] || status}</span>
    </span>
  );
}

function StatusList({ title, items, emptyMessage }) {
  if (!items || items.length === 0) {
    return (
      <div className="status-list">
        <h3>{title}</h3>
        <p className="status-empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="status-list">
      <h3>{title}</h3>
      <ul className="status-items">
        {items.map((item) => (
          <li
            key={item.id}
            className={`status-item status-item-${item.status}`}
            data-status={item.status}
          >
            <div className="status-item-header">
              <span className="status-item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="status-item-name">{item.name}</span>
              <StatusBadge status={item.status} label={item.label} />
            </div>
            {item.description && (
              <p className="status-item-description">{item.description}</p>
            )}
            {item.detail && <p className="status-item-detail">ℹ️ {item.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SystemStatus({ compact = false }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sources-status'],
    queryFn: getSourcesStatus,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="system-status system-status-loading">
        <p>⏳ Comprobando estado del sistema...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="system-status system-status-error">
        <p>⚠️ No se pudo obtener el estado del sistema.</p>
      </div>
    );
  }

  const sources = data.sources || [];
  const features = data.features || [];

  const operationalCount =
    sources.filter((s) => s.status === 'operational').length +
    features.filter((f) => f.status === 'operational').length;
  const pendingCount =
    sources.filter((s) =>
      ['in_development', 'unavailable', 'configuration_required'].includes(s.status),
    ).length +
    features.filter((f) =>
      ['in_development', 'unavailable', 'configuration_required'].includes(f.status),
    ).length;

  return (
    <div className={`system-status ${compact ? 'system-status-compact' : ''}`}>
      <div className="system-status-summary">
        <span className="status-summary-pill status-summary-ok">
          🟢 {operationalCount} operativa{operationalCount !== 1 ? 's' : ''}
        </span>
        {pendingCount > 0 && (
          <span className="status-summary-pill status-summary-pending">
            🔴 {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="system-status-grid">
        <StatusList
          title="📡 Fuentes de datos"
          items={sources}
          emptyMessage="No hay fuentes configuradas"
        />
        <StatusList
          title="⚙️ Funcionalidades"
          items={features}
          emptyMessage="No hay features configurados"
        />
      </div>

      <p className="system-status-legend">
        Las fuentes y funcionalidades marcadas como <strong>en desarrollo</strong> o{' '}
        <strong>no disponibles</strong> no afectan al resto del sistema; las búsquedas se
        completan con las fuentes operativas.
      </p>
    </div>
  );
}
