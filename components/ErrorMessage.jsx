'use client';

import './ErrorMessage.css';

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message">
      <p className="error-icon">⚠️</p>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          🔄 Reintentar
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
