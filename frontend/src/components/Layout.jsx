import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TitoModal from '../components/TitoModal';
import useTitoModal from '../hooks/useTitoModal';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { getRandomMessage, getRandomVideo, getRandomButtonText } = useTitoModal();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      setShowSearchModal(true);
    } else {
      navigate('/login');
    }
  };

  const handleSearchModalConfirm = () => {
    setShowSearchModal(false);
    navigate('/buscar');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <span className="logo-text">🚦 Seguimiento Movilidad</span>
            <span className="version">v1.2.0</span>
          </Link>
          <nav className="nav">
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              Inicio
            </Link>
            {isAuthenticated ? (
              <Link 
                to="/buscar" 
                className={location.pathname === '/buscar' ? 'active' : ''}
                onClick={handleSearchClick}
              >
                Buscar Sector
              </Link>
            ) : (
              <Link 
                to="/login" 
                className={location.pathname === '/login' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                Buscar Sector
              </Link>
            )}
            
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className={location.pathname === '/admin' ? 'active' : ''}
                  >
                    Admin
                  </Link>
                )}
                <Link 
                  to="/dashboard" 
                  className={location.pathname === '/dashboard' ? 'active' : ''}
                >
                  Dashboard
                </Link>
                <div className="user-menu">
                  <span className="username">{user?.username}</span>
                  <button onClick={handleLogout} className="logout-button">
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="login-button">
                Iniciar Sesión
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>Información de movilidad en tiempo real para Bogotá</p>
          <p className="footer-note">
            Fuentes: @SectorMovilidad, @BogotaTransito, @TransMilenio y bogota.gov.co
          </p>
        </div>
      </footer>
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          <span>Seguimiento Movilidad - v1.2.0 - Desarrollado por </span>
          <a 
            href="https://github.com/Jhogarcia111" 
            target="_blank" 
            rel="noopener noreferrer"
            className="developer-link"
          >
            @Jhogarcia111
          </a>
        </div>
      </div>

      {/* Modal de Búsqueda cuando se hace clic en "Buscar Sector" */}
      {isAuthenticated && (
        <TitoModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onConfirm={handleSearchModalConfirm}
          module="searching"
          videoPath={getRandomVideo('searching')}
          message={getRandomMessage('searching')}
          title="Buscando Información 🔍"
          confirmButtonText={getRandomButtonText('searching')}
        />
      )}
    </div>
  );
}

export default Layout;
