import React from 'react';
import './LoadingScreen.css';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-screen-background"></div>
      <div className="loading-screen-content">
        <div className="loading-screen-logo">
          <span className="loading-screen-emoji">🚦</span>
          <h1 className="loading-screen-title">Transito Tito</h1>
          <p className="loading-screen-subtitle">Seguimiento a la movilidad</p>
        </div>
        <div className="loading-screen-spinner">
          <div className="loading-spinner-circle"></div>
        </div>
        <p className="loading-screen-message">Cargando aplicación...</p>
      </div>
    </div>
  );
}

export default LoadingScreen;

