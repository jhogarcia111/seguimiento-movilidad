'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, X } from 'lucide-react';
import './IncidentCard.css';

const MAX_TITLE_CHARS = 80;
const MAX_DESCRIPTION_CHARS = 180;
const SHORT_LABELS = {
  manifestación: 'Manifestación',
  accidente: 'Accidente',
  obra: 'Obra',
  desvío: 'Desvío',
  otro: 'Otros',
};

function stripHtml(text) {
  if (!text) return '';
  return String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function shorten(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

function buildShortTitle(incident) {
  const raw = stripHtml(incident.title) || stripHtml(incident.description);
  // Tomar primera oración o fragmento útil
  const sentence = raw.split(/(?<=[\.!?])\s+/)[0] || raw;
  return shorten(sentence, MAX_TITLE_CHARS);
}

function formatRelative(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return 'Justo ahora';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `Hace ${diffDays} d`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

function formatAbsolute(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function getSourceIcon(source) {
  if (!source) return '📋';
  if (source.includes('twitter')) return '🐦';
  if (source.includes('movilidadbogota')) return '🛣️';
  if (source.includes('eltiempo')) return '📰';
  if (source.includes('bogota')) return '🏛️';
  if (source.includes('waze')) return '🗺️';
  return '📋';
}

function getFreshnessBadge(incident) {
  // Si el backend anotó `freshness`, lo usamos. Si no, lo calculamos al vuelo
  // desde el timestamp para mantener compatibilidad con resultados cacheados antiguos.
  let freshness = incident.freshness;
  if (!freshness && incident.timestamp) {
    const ts = new Date(incident.timestamp);
    if (!Number.isNaN(ts.getTime())) {
      const hours = (Date.now() - ts.getTime()) / (1000 * 60 * 60);
      if (hours > 24 * 7) freshness = 'expired';
      else if (hours > 24) freshness = 'stale';
    }
  }
  if (freshness === 'stale') {
    return { label: 'Posiblemente desactualizado', className: 'incident-freshness-stale' };
  }
  if (freshness === 'expired') {
    return { label: 'Antiguo (>7 días)', className: 'incident-freshness-expired' };
  }
  return null;
}

function IncidentCard({ incident, isMock = false }) {
  const [open, setOpen] = useState(false);

  const isIncidentMock =
    isMock ||
    (incident.id &&
      (incident.id.toString().includes('mock-') ||
        incident.id.toString().startsWith('mock-'))) ||
    (incident.source === 'twitter' &&
      !incident.url &&
      incident.id &&
      incident.id.toString().includes('mock-'));

  const cleanTitle = useMemo(() => buildShortTitle(incident), [incident]);
  const cleanDescription = useMemo(
    () => stripHtml(incident.content || incident.description || ''),
    [incident]
  );
  const previewDescription = useMemo(
    () => shorten(cleanDescription, MAX_DESCRIPTION_CHARS),
    [cleanDescription]
  );

  const hasMore =
    cleanDescription.length > MAX_DESCRIPTION_CHARS ||
    (stripHtml(incident.title) && stripHtml(incident.title).length > MAX_TITLE_CHARS);

  const relative = formatRelative(incident.timestamp);
  const absolute = formatAbsolute(incident.timestamp);
  const typeLabel = SHORT_LABELS[incident.type] || incident.type || 'Otros';
  const locationName = incident.location?.name;
  const freshnessBadge = getFreshnessBadge(incident);

  const openDetail = () => setOpen(true);
  const closeDetail = (e) => {
    e?.stopPropagation();
    setOpen(false);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  };

  return (
    <>
      <article
        className={`incident-card ${isIncidentMock ? 'mock-data' : ''}`}
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={handleKeyDown}
        aria-label={`Ver detalle de ${cleanTitle}`}
      >
        <header className="incident-header">
          <span className="incident-type">{typeLabel}</span>
          <div className="incident-header-meta">
            {freshnessBadge && (
              <span
                className={`incident-freshness ${freshnessBadge.className}`}
                title={`Fecha de publicación: ${absolute || 'desconocida'}`}
              >
                ⚠️ {freshnessBadge.label}
              </span>
            )}
            {relative && (
              <span className="incident-time" title={absolute || ''}>
                {relative}
              </span>
            )}
          </div>
        </header>

        <h4 className="incident-title">{cleanTitle}</h4>
        <p className="incident-description">{previewDescription}</p>

        {locationName && (
          <div className="incident-location" title={locationName}>
            📍 {locationName}
          </div>
        )}

        <footer className="incident-footer">
          <span className="incident-source">
            {getSourceIcon(incident.source)} {incident.source}
          </span>
          <div className="incident-actions">
            {isIncidentMock && <span className="mock-badge">Prueba</span>}
            <button
              type="button"
              className="incident-readmore"
              onClick={(e) => {
                e.stopPropagation();
                openDetail();
              }}
            >
              {hasMore ? 'Leer más' : 'Ver detalle'}
            </button>
          </div>
        </footer>
      </article>

      {open && (
        <div
          className="incident-modal-overlay"
          role="presentation"
          onClick={closeDetail}
        >
          <div
            className="incident-modal"
            role="dialog"
            aria-labelledby="incident-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="incident-modal-close"
              onClick={closeDetail}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <header className="incident-modal-header">
              <span className="incident-type">{typeLabel}</span>
              {absolute && (
                <span className="incident-time">
                  {absolute}
                  {relative ? ` · ${relative}` : ''}
                </span>
              )}
            </header>

            <h3 id="incident-modal-title" className="incident-modal-title">
              {stripHtml(incident.title) || cleanTitle}
            </h3>

            {locationName && (
              <div className="incident-modal-location">
                📍 <strong>{locationName}</strong>
              </div>
            )}

            <div className="incident-modal-body">
              {cleanDescription.split(/\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <footer className="incident-modal-footer">
              <span className="incident-source">
                {getSourceIcon(incident.source)} {incident.source}
              </span>
              {incident.url && (
                <a
                  href={incident.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="incident-link"
                >
                  Ver original <ExternalLink size={14} />
                </a>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export default IncidentCard;
