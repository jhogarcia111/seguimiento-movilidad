import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSearchClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/buscar');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="home-page">
      <div className="hero">
        <h1>🚦 Seguimiento de Movilidad en Bogotá</h1>
        <p className="subtitle">
          Consulta problemas de movilidad en tiempo real por sector
        </p>
        <Link to={isAuthenticated ? "/buscar" : "/login"} onClick={handleSearchClick} className="cta-button">
          Buscar por Sector
        </Link>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📍</div>
          <h3>Búsqueda por Sector</h3>
          <p>Busca por nombre de vía o intersección (ej: "Avenida Boyacá")</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Tiempo Real</h3>
          <p>Información actualizada de cuentas oficiales y bogota.gov.co</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>PWA</h3>
          <p>Instala como app en tu móvil para acceso rápido</p>
        </div>
      </div>

      <div className="info-section">
        <h2>Fuentes de Información</h2>
        <div className="sources">
          <div className="source-item">
            <strong>@SectorMovilidad</strong>
            <span>Secretaría Distrital de Movilidad</span>
          </div>
          <div className="source-item">
            <strong>@BogotaTransito</strong>
            <span>Tránsito Bogotá</span>
          </div>
          <div className="source-item">
            <strong>@TransMilenio</strong>
            <span>TransMilenio</span>
          </div>
          <div className="source-item">
            <strong>bogota.gov.co</strong>
            <span>Actualizaciones en vivo oficiales</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
