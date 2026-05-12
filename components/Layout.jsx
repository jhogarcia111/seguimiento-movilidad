'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';
import './Layout.css';

function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="container">
          <Link href="/" className="logo">
            <div className="logo-main">
              <span className="logo-text">🚦 Transito Tito</span>
              <span className="logo-subtitle">Seguimiento a la movilidad</span>
            </div>
            <span className="version">v2.0.0</span>
          </Link>
          <nav className="nav">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
              Inicio
            </Link>
            {isAuthenticated ? (
              <Link href="/buscar" className={pathname === '/buscar' ? 'active' : ''}>
                Buscar Sector
              </Link>
            ) : (
              <Link href="/login" className={pathname === '/login' ? 'active' : ''}>
                Buscar Sector
              </Link>
            )}

            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>
                      Admin
                    </Link>
                    <Link
                      href="/test-scraping"
                      className={pathname === '/test-scraping' ? 'active' : ''}
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
              <Link href="/login" className="login-button">
                Iniciar Sesión
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
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
          <span>Transito Tito - v2.0.0 - Desarrollado por </span>
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
