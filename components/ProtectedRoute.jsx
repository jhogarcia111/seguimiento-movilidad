'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, isAdmin, requireAdmin, router]);

  if (loading || !isAuthenticated || (requireAdmin && !isAdmin)) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
