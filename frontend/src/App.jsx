import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoProvider } from './contexts/VideoContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LogViewer from './components/LogViewer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SectorSearch from './pages/SectorSearch';
import TestScraping from './pages/TestScraping';
import PendingApprovalPage from './pages/PendingApprovalPage';
import AccountActivatedPage from './pages/AccountActivatedPage';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular carga inicial de la aplicación
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 1.5 segundos de carga

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <VideoProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/account-activated" element={<AccountActivatedPage />} />
        
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route
            path="buscar"
            element={
              <ProtectedRoute>
                <SectorSearch />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="test-scraping"
            element={
              <ProtectedRoute>
                <TestScraping />
              </ProtectedRoute>
            }
          />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LogViewer />
      </VideoProvider>
    </AuthProvider>
  );
}

export default App;
