'use client';

import './SkeletonCard.css';

/**
 * Skeleton para una card de incidente (usado en /buscar y home).
 */
export function IncidentSkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card-header">
        <div className="skeleton-line skeleton-line-pill" />
        <div className="skeleton-line skeleton-line-xs" />
      </div>
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-narrow" />
      <div className="skeleton-line skeleton-line-md" />
      <div className="skeleton-card-footer">
        <div className="skeleton-line skeleton-line-sm" />
        <div className="skeleton-line skeleton-line-sm" />
      </div>
    </div>
  );
}

export default function IncidentSkeletonGrid({ count = 4 }) {
  return (
    <div className="skeleton-grid" role="status" aria-live="polite" aria-label="Cargando resultados">
      {Array.from({ length: count }).map((_, i) => (
        <IncidentSkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para filas (usado en /dashboard historial).
 */
export function SkeletonRows({ count = 5 }) {
  return (
    <div className="skeleton-list" role="status" aria-live="polite" aria-label="Cargando historial">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-narrow" />
          <div className="skeleton-line skeleton-line-md" />
        </div>
      ))}
    </div>
  );
}
