'use client';

import './LoadingSpinner.css';

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Buscando información...</p>
    </div>
  );
}

export default LoadingSpinner;
