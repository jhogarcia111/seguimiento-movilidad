import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <Link to="/" className="logo">
            <div className="logo-main">
              <span className="logo-text">🚦 Transito Tito</span>
              <span className="logo-subtitle">Seguimiento a la movilidad</span>
            </div>
            <span className="version">v1.3.0</span>
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
                  <>
                    <Link 
                      to="/admin" 
                      className={location.pathname === '/admin' ? 'active' : ''}
                    >
                      Admin
                    </Link>
                    <Link 
                      to="/test-scraping" 
                      className={location.pathname === '/test-scraping' ? 'active' : ''}
                    >
                      🧪 Test Scraping
                    </Link>
                    <Notifications />
                  </>
                )}
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
          <span>Transito Tito - v1.3.0 - Desarrollado por </span>
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

    </div>
  );
}

export default Layout;
