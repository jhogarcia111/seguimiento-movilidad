import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Notifications.css';

function Notifications() {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query para obtener notificaciones no leídas
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['admin-notifications', 'unread'],
    queryFn: async () => {
      const response = await api.get('/api/admin/notifications?unread_only=true&limit=20');
      return response.data.notifications || [];
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    enabled: isAdmin // Solo se ejecuta si el usuario es admin
  });

  // Query para obtener el conteo de notificaciones no leídas
  const { data: countData } = useQuery({
    queryKey: ['admin-notifications-count'],
    queryFn: async () => {
      const response = await api.get('/api/admin/notifications/count');
      return response.data.count || 0;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    enabled: isAdmin // Solo se ejecuta si el usuario es admin
  });

  const unreadCount = countData || 0;
  const notifications = notificationsData || [];

  // Mutación para marcar una notificación como leída
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await api.patch(`/api/admin/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-notifications']);
      queryClient.invalidateQueries(['admin-notifications-count']);
    }
  });

  // Mutación para marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/admin/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-notifications']);
      queryClient.invalidateQueries(['admin-notifications-count']);
      setIsOpen(false);
    }
  });

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Cerrar dropdown
    setIsOpen(false);

    // Navegar a la URL de la notificación
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button
        className="notifications-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
        {unreadCount > 0 && (
          <span className="notifications-bulb">💡</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="notifications-list">
            {isLoading ? (
              <div className="notifications-loading">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-empty">
                No hay notificaciones nuevas
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <h4 className="notification-title">{notification.title}</h4>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  {!notification.is_read && (
                    <div className="notification-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;

