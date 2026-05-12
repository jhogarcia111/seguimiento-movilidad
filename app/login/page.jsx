'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(username, password);
      } else {
        result = await register(username, email, password);
        if (result.success) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('wasPending', 'true');
          }
          router.push('/pending-approval');
          return;
        }
      }

      if (result.success) {
        if (result.pending || result.user?.approval_status === 'pending') {
          router.push('/pending-approval');
        } else {
          const wasPending =
            typeof window !== 'undefined' &&
            window.localStorage.getItem('wasPending') === 'true';
          if (wasPending && result.user?.approval_status === 'active') {
            window.localStorage.removeItem('wasPending');
            router.push('/account-activated');
            return;
          }
          const redirectPath = result.user?.role === 'admin' ? '/admin' : '/';
          router.push(redirectPath);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>🚦 Transito Tito</h1>
        <p className="subtitle">Seguimiento a la movilidad</p>
        <div className="version-badge">v2.0.0</div>
        <h2>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Nombre de usuario"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
              />
            </div>
          )}

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <div className="switch-mode">
          <div className="switch-mode-container">
            <p>
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="link-button"
              >
                {isLogin ? 'Registrarse' : 'Iniciar Sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
