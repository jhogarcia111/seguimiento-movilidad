'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Hidratar token desde localStorage solo en el cliente (evita ReferenceError en SSR)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('token');
      if (stored) {
        setToken(stored);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Cargar usuario al iniciar si hay token
  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token]);

  // Registrar app_open cuando el usuario carga la aplicación
  useEffect(() => {
    if (user && token) {
      // Registrar actividad de apertura de app
      const registerAppOpen = async () => {
        try {
          await api.post('/api/auth/app-open', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          // No fallar si falla el registro de actividad
          console.error('Error registrando actividad de app_open:', error);
        }
      };
      registerAppOpen();
    }
  }, [user, token]);

  const loadUser = async () => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Error cargando usuario:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        username,
        password
      });

      const { user: userData, token: newToken, pending } = response.data;
      
      // Si el usuario está pendiente, no guardar token pero retornar información
      if (pending || userData?.approval_status === 'pending') {
        return { 
          success: true, 
          user: userData, 
          pending: true 
        };
      }
      
      // Usuario activo, guardar token
      if (newToken) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('token', newToken);
        }
        setToken(newToken);
        setUser(userData);
      }
      
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      });

      return { success: true, message: 'Usuario registrado exitosamente' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al registrar usuario'
      };
    }
  };

  const logout = async () => {
    // Registrar actividad de logout antes de limpiar el usuario
    if (user && token) {
      try {
        await api.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        // No fallar el logout si falla el registro de actividad
        console.error('Error registrando actividad de logout:', error);
      }
    }
    
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
