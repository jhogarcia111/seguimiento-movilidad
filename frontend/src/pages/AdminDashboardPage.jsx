import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import IncidentList from '../components/IncidentList';
import LocationMap from '../components/LocationMap';
import './AdminDashboardPage.css';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartDataLabels
);

function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  
  // Actualizar tab cuando cambie la URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
  const [sourcesSearchTerm, setSourcesSearchTerm] = useState('');

  // Query para fuentes
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['admin-sources'],
    queryFn: async () => {
      const response = await api.get('/api/admin/sources');
      return response.data;
    },
    staleTime: 0, // Siempre buscar datos frescos
    cacheTime: 0, // No cachear resultados
    refetchOnMount: true, // Refrescar al montar
    refetchOnWindowFocus: true // Refrescar al enfocar la ventana
  });

  // Query para tags
  const { data: tagsData } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: async () => {
      const response = await api.get('/api/admin/tags');
      return response.data;
    }
  });

  // Query para usuarios
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/api/admin/users');
      return response.data;
    }
  });

  // Query para estado del API
  const { data: apiStatusData, isLoading: apiStatusLoading } = useQuery({
    queryKey: ['admin-api-status'],
    queryFn: async () => {
      const response = await api.get('/api/admin/api-status');
      return response.data;
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
    staleTime: 0
  });

  // Query para configuración del sistema
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const response = await api.get('/api/admin/config');
      return response.data;
    },
    staleTime: 0
  });

  // Mutación para actualizar configuración
  const configMutation = useMutation({
    mutationFn: async ({ key, value, description }) => {
      return api.put(`/api/admin/config/${key}`, { value, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-config']);
      queryClient.invalidateQueries(['admin-api-status']);
    }
  });

  // Mutación para crear/actualizar fuente
  const sourceMutation = useMutation({
    mutationFn: async (sourceData) => {
      if (editingSource) {
        return api.put(`/api/admin/sources/${editingSource.id}`, sourceData);
      } else {
        return api.post('/api/admin/sources', sourceData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-sources']);
      setShowSourceForm(false);
      setEditingSource(null);
    }
  });

  // Mutación para desactivar usuario
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId) => {
      return api.delete(`/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    }
  });

  // Mutación para cambiar approval_status
  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, approvalStatus }) => {
      return api.put(`/api/admin/users/${userId}/approve`, { approval_status: approvalStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    }
  });

  // Mutación para cambiar is_active (activar/desactivar)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      return api.put(`/api/admin/users/${userId}`, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
    }
  });

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestión de fuentes, tags y usuarios</p>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
        <button
          className={activeTab === 'sources' ? 'active' : ''}
          onClick={() => setActiveTab('sources')}
        >
          📡 Fuentes
        </button>
        <button
          className={activeTab === 'tags' ? 'active' : ''}
          onClick={() => setActiveTab('tags')}
        >
          🏷️ Tags
        </button>
        <button
          className={activeTab === 'api-status' ? 'active' : ''}
          onClick={() => setActiveTab('api-status')}
        >
          🔌 Estado del API
        </button>
        <button
          className={activeTab === 'config' ? 'active' : ''}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuración
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="analytics-section">
            <AnalyticsDashboard searchParams={searchParams} />
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="sources-section">
            <div className="section-header-with-search">
              <h2>Fuentes de Información</h2>
              <div className="sources-header-actions">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, identifier, tipo, ciudad o tags..."
                  value={sourcesSearchTerm}
                  onChange={(e) => setSourcesSearchTerm(e.target.value)}
                  className="sources-header-search-input"
                />
                <button
                  onClick={() => {
                    setEditingSource(null);
                    setShowSourceForm(!showSourceForm);
                  }}
                  className="add-button"
                >
                  {showSourceForm ? '− Cancelar' : '+ Agregar Fuente'}
                </button>
              </div>
            </div>

            {showSourceForm && (
              <SourceForm
                editingSource={editingSource}
                tags={tagsData?.tags || []}
                onSubmit={(data) => {
                  sourceMutation.mutate(data);
                }}
                onCancel={() => {
                  setShowSourceForm(false);
                  setEditingSource(null);
                }}
              />
            )}

            {sourcesLoading ? (
              <p>Cargando fuentes...</p>
            ) : (
              <SourcesList
                sources={(sourcesData?.sources || []).filter((source, index, self) => 
                  index === self.findIndex(s => s.identifier === source.identifier)
                )}
                searchTerm={sourcesSearchTerm}
                onEdit={(source) => {
                  setEditingSource(source);
                  setShowSourceForm(true);
                }}
                onDeactivate={(id) => {
                  setConfirmModal({
                    isOpen: true,
                    type: 'danger',
                    title: 'Desactivar fuente',
                    message: '¿Estás seguro de que deseas desactivar esta fuente? Esta acción puede desactivar la fuente.',
                    onConfirm: () => {
                      api.delete(`/api/admin/sources/${id}`).then(() => {
                        queryClient.invalidateQueries(['admin-sources']);
                      });
                    }
                  });
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>Usuarios</h2>
            </div>
            {usersLoading ? (
              <p>Cargando usuarios...</p>
            ) : (
              <UsersList
                users={usersData?.users || []}
                onNavigateToDashboard={(userId) => {
                  setActiveTab('dashboard');
                  navigate(`/admin?tab=dashboard&user=${userId}`, { replace: true });
                }}
                onDeactivate={(id) => {
                  setConfirmModal({
                    isOpen: true,
                    type: 'danger',
                    title: 'Desactivar usuario',
                    message: '¿Estás seguro de que deseas desactivar este usuario? El usuario no podrá acceder al sistema.',
                    onConfirm: () => {
                      deactivateUserMutation.mutate(id);
                    }
                  });
                }}
                onApprove={(id, status) => {
                  const statusText = status === 'active' ? 'activar' : status === 'pending' ? 'marcar como pendiente' : 'desactivar';
                  const statusLabel = status === 'active' ? 'Activar' : status === 'pending' ? 'Marcar como pendiente' : 'Desactivar';
                  const confirmMessage = status === 'active' 
                    ? '¿Estás seguro de que deseas activar este usuario? El usuario podrá acceder al sistema.'
                    : status === 'pending'
                    ? '¿Estás seguro de que deseas marcar este usuario como pendiente? El usuario no podrá acceder hasta ser aprobado.'
                    : '¿Estás seguro de que deseas desactivar este usuario? El usuario no podrá acceder al sistema.';
                  
                  setConfirmModal({
                    isOpen: true,
                    type: status === 'active' ? 'success' : 'warning',
                    title: `${statusLabel} usuario`,
                    message: confirmMessage,
                    onConfirm: () => {
                      approveUserMutation.mutate({ userId: id, approvalStatus: status });
                    }
                  });
                }}
                onToggleActive={(id, currentStatus) => {
                  const newStatus = !currentStatus;
                  const actionText = newStatus ? 'activar' : 'desactivar';
                  const confirmType = newStatus ? 'success' : 'danger';
                  setConfirmModal({
                    isOpen: true,
                    type: confirmType,
                    title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} usuario`,
                    message: `¿Estás seguro de que deseas ${actionText} este usuario? ${newStatus ? 'El usuario podrá acceder al sistema.' : 'El usuario no podrá acceder al sistema.'}`,
                    onConfirm: () => {
                      toggleActiveMutation.mutate({ userId: id, isActive: newStatus });
                    }
                  });
                }}
                onEdit={(user) => {
                  setEditUserModal({ isOpen: true, user });
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="tags-section">
            <h2>Tags/Categorías</h2>
            <TagsList tags={tagsData?.tags || []} />
          </div>
        )}

        {activeTab === 'api-status' && (
          <div className="api-status-section">
            <h2>🔌 Estado del API de Twitter</h2>
            {apiStatusLoading ? (
              <p>Cargando estado del API...</p>
            ) : apiStatusData?.apiStatus ? (
              <ApiStatusDisplay status={apiStatusData.apiStatus} />
            ) : (
              <p>Error al cargar el estado del API</p>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="config-section">
            <h2>⚙️ Configuración del Sistema</h2>
            {configLoading ? (
              <p>Cargando configuración...</p>
            ) : (
              <SystemConfig 
                config={configData?.config || {}}
                onUpdate={(key, value, description) => {
                  configMutation.mutate({ key, value, description });
                }}
                isUpdating={configMutation.isLoading}
              />
            )}
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Aceptar"
        cancelText="Cancelar"
      />
      
      <EditUserModal
        isOpen={editUserModal.isOpen}
        user={editUserModal.user}
        onClose={() => setEditUserModal({ isOpen: false, user: null })}
        onSave={(userData) => {
          api.put(`/api/admin/users/${editUserModal.user.id}`, userData)
            .then(() => {
              queryClient.invalidateQueries(['admin-users']);
              setEditUserModal({ isOpen: false, user: null });
              setConfirmModal({
                isOpen: true,
                type: 'success',
                title: 'Éxito',
                message: 'Usuario actualizado exitosamente',
                onConfirm: () => setConfirmModal({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
              });
            })
            .catch(error => {
              console.error('Error actualizando usuario:', error);
              setConfirmModal({
                isOpen: true,
                type: 'danger',
                title: 'Error',
                message: error.response?.data?.message || 'Error al actualizar usuario',
                onConfirm: () => setConfirmModal({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null })
              });
            });
        }}
      />
    </div>
  );
}

// Componente Modal para editar usuario
function EditUserModal({ isOpen, user, onClose, onSave }) {
  const [formData, setFormData] = useState({ username: '', email: '', role: 'user' });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user'
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="edit-user-modal-overlay" onClick={onClose}>
      <div className="edit-user-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-user-modal-header">
          <h3>Editar Usuario</h3>
          <button className="edit-user-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-user-modal-form">
          <div className="edit-user-modal-field">
            <label>Usuario</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div className="edit-user-modal-field">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="edit-user-modal-field">
            <label>Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="user">👤 Usuario</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>
          <div className="edit-user-modal-actions">
            <button type="button" onClick={onClose} className="edit-user-modal-cancel">
              Cancelar
            </button>
            <button type="submit" className="edit-user-modal-save">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente para formulario de fuente
function SourceForm({ editingSource, tags, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: editingSource?.name || '',
    type: editingSource?.type || 'twitter',
    identifier: editingSource?.identifier || '',
    description: editingSource?.description || '',
    city: editingSource?.city || '',
    is_active: editingSource?.is_active !== undefined ? editingSource.is_active : true,
    tagIds: editingSource?.tags?.map(t => t.id) || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="source-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Nombre</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="form-group">
        <label>Tipo</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          required
        >
          <option value="twitter">Twitter</option>
          <option value="web">Web</option>
          <option value="api">API</option>
        </select>
      </div>
      <div className="form-group">
        <label>Identifier</label>
        <input
          type="text"
          value={formData.identifier}
          onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
          required
          placeholder="@username o URL"
        />
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>Ciudad</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="Bogotá, Medellín, etc."
        />
      </div>
      <div className="form-group">
        <label>Tags</label>
        <div className="tags-checkbox">
          {tags.map(tag => (
            <label key={tag.id} className="tag-checkbox">
              <input
                type="checkbox"
                checked={formData.tagIds.includes(tag.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, tagIds: [...formData.tagIds, tag.id] });
                  } else {
                    setFormData({ ...formData, tagIds: formData.tagIds.filter(id => id !== tag.id) });
                  }
                }}
              />
              <span style={{ color: tag.color }}>🏷️ {tag.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="submit-button">
          {editingSource ? 'Actualizar' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel} className="cancel-button">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// Componente para lista de fuentes (DataTable)
function SourcesList({ sources, onEdit, onDeactivate, searchTerm = '' }) {
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  // Deduplicar por identifier por si acaso
  const uniqueSources = sources.reduce((acc, source) => {
    const existing = acc.find(s => s.identifier === source.identifier);
    if (!existing) {
      acc.push(source);
    } else {
      // Si hay duplicado, mantener el que tiene más tags o el ID más bajo
      if (!source.tags || source.tags.length > (existing.tags?.length || 0)) {
        const index = acc.indexOf(existing);
        acc[index] = source;
      } else if (source.tags && existing.tags && source.tags.length === existing.tags.length && source.id < existing.id) {
        const index = acc.indexOf(existing);
        acc[index] = source;
      }
    }
    return acc;
  }, []);

  // Función para ordenar
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtrar fuentes por término de búsqueda
  const filteredSources = uniqueSources.filter(source => {
    const searchLower = searchTerm.toLowerCase();
    return (
      source.name.toLowerCase().includes(searchLower) ||
      source.identifier.toLowerCase().includes(searchLower) ||
      source.type.toLowerCase().includes(searchLower) ||
      (source.city && source.city.toLowerCase().includes(searchLower)) ||
      (source.tags && source.tags.some(tag => tag.name.toLowerCase().includes(searchLower)))
    );
  });

  // Ordenar fuentes
  const sortedSources = [...filteredSources].sort((a, b) => {
    let aValue = a[sortConfig.key] || '';
    let bValue = b[sortConfig.key] || '';
    
    // Convertir a string para comparación
    aValue = String(aValue).toLowerCase();
    bValue = String(bValue).toLowerCase();
    
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span style={{ marginLeft: '5px', opacity: 0.3 }}>↕️</span>;
    }
    return <span style={{ marginLeft: '5px' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Construir URL según el tipo de fuente
  const getSourceUrl = (source) => {
    if (source.type === 'twitter') {
      return `https://twitter.com/${source.identifier}`;
    } else if (source.type === 'web') {
      return source.identifier.startsWith('http') ? source.identifier : `https://${source.identifier}`;
    }
    return null;
  };

  return (
    <div className="sources-list">
      {searchTerm && (
        <div className="sources-search-count-display">
          {filteredSources.length} de {uniqueSources.length} fuentes encontradas
        </div>
      )}
      <div className="sources-table-container">
        <table className="sources-table">
        <thead>
          <tr>
            <th 
              onClick={() => handleSort('name')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Nombre <SortIcon columnKey="name" />
            </th>
            <th>Tipo</th>
            <th>Identifier</th>
            <th>Ciudad</th>
            <th>Tags</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedSources.map(source => (
            <tr key={`${source.id}-${source.identifier}`}>
              <td>
                <strong>{source.name}</strong>
              </td>
              <td>{source.type}</td>
              <td>
                {getSourceUrl(source) ? (
                  <a 
                    href={getSourceUrl(source)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-link"
                    title={`Abrir ${source.name} en nueva ventana`}
                  >
                    {source.identifier}
                  </a>
                ) : (
                  source.identifier
                )}
              </td>
              <td>{source.city || '-'}</td>
              <td>
                {source.tags && source.tags.length > 0 ? (
                  <div className="source-tags-inline">
                    {source.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="tag-badge" 
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td>
                <span className={`status-badge ${source.is_active ? 'active' : 'inactive'}`}>
                  {source.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td>
                <div className="source-actions-inline">
                  <button onClick={() => onEdit(source)} className="edit-button">
                    ✏️ Editar
                  </button>
                  <button onClick={() => onDeactivate(source.id)} className="delete-button">
                    {source.is_active ? '🗑️ Desactivar' : '✅ Activar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// Componente para lista de usuarios
function UsersList({ users, onDeactivate, onApprove, onToggleActive, onEdit, onNavigateToDashboard }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const getApprovalStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'pending':
        return 'En Aprobación';
      case 'inactive':
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  };

  const getApprovalStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'active';
      case 'pending':
        return 'pending';
      case 'inactive':
        return 'inactive';
      default:
        return '';
    }
  };

  // Formatear fecha como "01-En-25"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Filtrar usuarios por término de búsqueda
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.id.toString().includes(searchTerm)
    );
  });

  return (
    <div className="users-list">
      <div className="users-search-container">
        <input
          type="text"
          placeholder="🔍 Buscar por usuario, email o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="users-search-input"
        />
        {searchTerm && (
          <span className="users-search-count">
            {filteredUsers.length} de {users.length} usuarios
          </span>
        )}
      </div>
      <div className="users-table-container">
        <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Autorizado</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Aprobación</th>
                <th>Fecha Creación</th>
                <th>Actividades</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const activityCount = user.activity_count || 0;
                const isPending = user.approval_status === 'pending';
                const isActiveWithZeroActivities = user.approval_status === 'active' && activityCount === 0;
                const rowClassName = isPending ? 'user-row-pending' : (isActiveWithZeroActivities ? 'user-row-inactive' : '');
                
                return (
                <tr key={user.id} className={rowClassName}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <div className="user-actions">
                      <button 
                        onClick={() => onApprove(user.id, user.approval_status === 'active' ? 'pending' : 'active')} 
                        className={`toggle-active-button ${user.approval_status === 'active' ? 'active' : 'inactive'}`}
                        title={user.approval_status === 'active' ? 'Marcar como pendiente' : 'Autorizar usuario'}
                      >
                        {user.approval_status === 'active' ? '🟢 Autorizado' : '🔴 Por aprobar'}
                      </button>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                    </span>
                  </td>
                  <td>
                    <div className="user-actions">
                      <button 
                        onClick={() => onToggleActive(user.id, user.is_active)} 
                        className={`toggle-active-button ${user.is_active ? 'active' : 'inactive'}`}
                        title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {user.is_active ? '🟢 Activo' : '🔴 Inactivado'}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`approval-badge ${getApprovalStatusClass(user.approval_status)}`}>
                      {getApprovalStatusLabel(user.approval_status)}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Navegar al dashboard con filtro de usuario
                        if (onNavigateToDashboard) {
                          onNavigateToDashboard(user.id);
                        } else {
                          navigate(`/admin?tab=dashboard&user=${user.id}`, { replace: true });
                          // Recargar para aplicar el filtro
                          window.location.href = `/admin?tab=dashboard&user=${user.id}`;
                        }
                      }}
                      className="activity-count-clickable"
                      title="Ver actividades de este usuario"
                    >
                      {activityCount}
                    </button>
                  </td>
                  <td>
                    <div className="user-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEdit) onEdit(user);
                        }}
                        className="edit-button icon-only"
                        title="Editar usuario"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeactivate) onDeactivate(user.id);
                        }}
                        className="delete-button icon-only"
                        title="Eliminar usuario"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
      </table>
      </div>
    </div>
  );
}

// Componente para lista de tags
function TagsList({ tags }) {
  return (
    <div className="tags-list">
      {tags.map(tag => (
        <div key={tag.id} className="tag-card" style={{ borderLeftColor: tag.color }}>
          <div className="tag-name" style={{ color: tag.color }}>
            🏷️ {tag.name}
          </div>
          {tag.description && <p className="tag-description">{tag.description}</p>}
        </div>
      ))}
    </div>
  );
}

// Componente para Dashboard de Analytics
function AnalyticsDashboard({ searchParams: searchParamsProp }) {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchResultsModal, setSearchResultsModal] = useState({ isOpen: false, searchId: null, sector: '', searchData: null });
  const [loading, setLoading] = useState(true);
  
  // Usar searchParams de props si está disponible, de lo contrario usar el hook
  const [searchParamsFromHook] = useSearchParams();
  const searchParams = searchParamsProp || searchParamsFromHook;
  
  // Estados para filtros - inicializar desde URL si existe
  const urlUserId = searchParams ? searchParams.get('user') : null;
  const [selectedUserId, setSelectedUserId] = useState(urlUserId || '');
  const [timeFilter, setTimeFilter] = useState('mensual'); // 'diario', 'semanal', 'mensual', '3dias', '7dias', '15dias'
  
  // Si hay un user_id en la URL, actualizar el filtro
  useEffect(() => {
    if (searchParams) {
      const urlUserId = searchParams.get('user');
      if (urlUserId) {
        setSelectedUserId(urlUserId);
      } else {
        setSelectedUserId('');
      }
    }
  }, [searchParams]);
  
  // Estados para paginación y filtros
  const [userActivitiesPage, setUserActivitiesPage] = useState(1);
  const [userActivitiesPerPage] = useState(10);
  const [userActivitiesSearch, setUserActivitiesSearch] = useState('');
  const [recentActivitiesPage, setRecentActivitiesPage] = useState(1);
  const [recentActivitiesPerPage] = useState(10);
  const [recentActivitiesSearch, setRecentActivitiesSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedUserId, timeFilter]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = null;
    let endDate = null;

    switch (timeFilter) {
      case 'diario':
        startDate = today;
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'semanal':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'mensual':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case '3dias':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 3);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case '7dias':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case '15dias':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 15);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);
    }

    return {
      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
      endDate: endDate ? endDate.toISOString().split('T')[0] : null
    };
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange();
      const params = new URLSearchParams();
      
      if (selectedUserId) {
        params.append('user_id', selectedUserId);
      }
      if (dateRange.startDate) {
        params.append('start_date', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('end_date', dateRange.endDate);
      }

      // Cargar estadísticas con filtros
      const statsResponse = await api.get(`/api/admin/analytics/stats?${params.toString()}`);
      setStats(statsResponse.data.stats);

      // Cargar todas las actividades con filtros
      const activitiesParams = new URLSearchParams();
      activitiesParams.append('limit', '1000');
      if (selectedUserId) {
        activitiesParams.append('user_id', selectedUserId);
      }
      if (dateRange.startDate) {
        activitiesParams.append('start_date', dateRange.startDate);
      }
      if (dateRange.endDate) {
        activitiesParams.append('end_date', dateRange.endDate);
      }
      
      const activitiesResponse = await api.get(`/api/admin/activities?${activitiesParams.toString()}`);
      setActivities(activitiesResponse.data.activities);
    } catch (error) {
      console.error('Error cargando analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityTypeLabel = (type) => {
    const labels = {
      'login': '🔐 Login',
      'logout': '🚪 Logout',
      'search': '🔍 Búsqueda',
      'app_open': '📱 Apertura de App'
    };
    return labels[type] || type;
  };

  const getActivityTypeColor = (type) => {
    const colors = {
      'login': '#34a853',
      'logout': '#ea4335',
      'search': '#1a73e8',
      'app_open': '#fbbc04'
    };
    return colors[type] || '#5f6368';
  };

  // Query para obtener resultados de una búsqueda
  const { data: searchResultsData, isLoading: searchResultsLoading } = useQuery({
    queryKey: ['admin-search-results', searchResultsModal.searchId],
    queryFn: async () => {
      if (!searchResultsModal.searchId) return null;
      const response = await api.get(`/api/admin/searches/${searchResultsModal.searchId}/results`);
      return response.data;
    },
    enabled: !!searchResultsModal.searchId && searchResultsModal.isOpen,
    staleTime: 0
  });

  // Función para manejar el clic en detalles de búsqueda
  const handleSearchDetailsClick = (activity) => {
    if (activity.activity_type === 'search' && activity.activity_data?.search_id) {
      setSearchResultsModal({
        isOpen: true,
        searchId: activity.activity_data.search_id,
        sector: activity.activity_data.sector || '',
        searchData: null
      });
    }
  };

  // Preparar datos para gráfico de barras apiladas por día
  const prepareDailyChartData = () => {
    if (!stats || !stats.by_day || stats.by_day.length === 0) return null;

    // Agrupar por día y tipo
    const dailyData = {};
    stats.by_day.forEach(item => {
      const date = item.date;
      if (!dailyData[date]) {
        dailyData[date] = { login: 0, logout: 0, search: 0, app_open: 0 };
      }
      dailyData[date][item.activity_type] = item.count;
    });

    const dates = Object.keys(dailyData).sort().slice(-30); // Últimos 30 días

    return {
      labels: dates.map(date => new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })),
      datasets: [
        {
          label: '🔐 Login',
          data: dates.map(date => dailyData[date].login || 0),
          backgroundColor: '#34a853',
        },
        {
          label: '🚪 Logout',
          data: dates.map(date => dailyData[date].logout || 0),
          backgroundColor: '#ea4335',
        },
        {
          label: '🔍 Búsqueda',
          data: dates.map(date => dailyData[date].search || 0),
          backgroundColor: '#1a73e8',
        },
        {
          label: '📱 Apertura de App',
          data: dates.map(date => dailyData[date].app_open || 0),
          backgroundColor: '#fbbc04',
        }
      ]
    };
  };

  // Preparar datos para gráfico de actividades por usuario
  const prepareUserChartData = () => {
    if (!stats || !stats.by_user || stats.by_user.length === 0) return null;

    // Agrupar por usuario (sumar todos los tipos)
    const userTotals = {};
    stats.by_user.forEach(item => {
      if (!userTotals[item.username]) {
        userTotals[item.username] = 0;
      }
      userTotals[item.username] += item.count;
    });

    // Ordenar por total y tomar top 10
    const sortedUsers = Object.entries(userTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      labels: sortedUsers.map(([username]) => username),
      datasets: [
        {
          label: 'Total de Actividades',
          data: sortedUsers.map(([, count]) => count),
          backgroundColor: sortedUsers.map((_, idx) => {
            const colors = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#ff9800', '#00bcd4', '#795548', '#607d8b', '#ff5722'];
            return colors[idx % colors.length];
          }),
        }
      ]
    };
  };

  // Filtrar y paginar actividades por usuario
  const filteredUserActivities = stats && stats.by_user ? stats.by_user.filter(item => {
    if (!userActivitiesSearch) return true;
    const searchLower = userActivitiesSearch.toLowerCase();
    return item.username?.toLowerCase().includes(searchLower) ||
           (item.email && item.email.toLowerCase().includes(searchLower));
  }) : [];

  const userActivitiesStart = (userActivitiesPage - 1) * userActivitiesPerPage;
  const userActivitiesEnd = userActivitiesStart + userActivitiesPerPage;
  const paginatedUserActivities = filteredUserActivities.slice(userActivitiesStart, userActivitiesEnd);
  const totalUserActivitiesPages = Math.ceil(filteredUserActivities.length / userActivitiesPerPage);

  // Filtrar y paginar actividades recientes
  const filteredRecentActivities = activities.filter(activity => {
    if (!recentActivitiesSearch) return true;
    const searchLower = recentActivitiesSearch.toLowerCase();
    return activity.username.toLowerCase().includes(searchLower) ||
           getActivityTypeLabel(activity.activity_type).toLowerCase().includes(searchLower) ||
           (activity.activity_data?.sector && activity.activity_data.sector.toLowerCase().includes(searchLower));
  });

  const recentActivitiesStart = (recentActivitiesPage - 1) * recentActivitiesPerPage;
  const recentActivitiesEnd = recentActivitiesStart + recentActivitiesPerPage;
  const paginatedRecentActivities = filteredRecentActivities.slice(recentActivitiesStart, recentActivitiesEnd);
  const totalRecentActivitiesPages = Math.ceil(filteredRecentActivities.length / recentActivitiesPerPage);

  const dailyChartData = prepareDailyChartData();
  const userChartData = prepareUserChartData();

  if (loading) {
    return <p>Cargando analytics...</p>;
  }

  return (
    <div className="analytics-dashboard">
      <h2>📊 Dashboard - Uso de la Aplicación</h2>
      
      {/* Filtros */}
      <div className="dashboard-filters">
        <div className="filter-group">
          <label htmlFor="user-filter" className="filter-label">Usuario:</label>
          <select
            id="user-filter"
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setUserActivitiesPage(1);
              setRecentActivitiesPage(1);
            }}
            className="filter-select"
          >
            <option value="">Todos los usuarios</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} {user.email ? `(${user.email})` : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Período:</label>
          <div className="time-filter-buttons">
            <button
              className={`time-filter-btn ${timeFilter === 'diario' ? 'active' : ''}`}
              onClick={() => setTimeFilter('diario')}
            >
              Diario
            </button>
            <button
              className={`time-filter-btn ${timeFilter === 'semanal' ? 'active' : ''}`}
              onClick={() => setTimeFilter('semanal')}
            >
              Semanal
            </button>
            <button
              className={`time-filter-btn ${timeFilter === 'mensual' ? 'active' : ''}`}
              onClick={() => setTimeFilter('mensual')}
            >
              Mensual
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '3dias' ? 'active' : ''}`}
              onClick={() => setTimeFilter('3dias')}
            >
              3 Días
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '7dias' ? 'active' : ''}`}
              onClick={() => setTimeFilter('7dias')}
            >
              7 Días
            </button>
            <button
              className={`time-filter-btn ${timeFilter === '15dias' ? 'active' : ''}`}
              onClick={() => setTimeFilter('15dias')}
            >
              15 Días
            </button>
          </div>
        </div>
      </div>
      
      {/* Estadísticas generales */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total de Actividades</h3>
            <p className="stat-value">{stats.totals.total_activities || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Usuarios Únicos</h3>
            <p className="stat-value">{stats.totals.unique_users || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Días Activos</h3>
            <p className="stat-value">{stats.totals.active_days || 0}</p>
          </div>
        </div>
      )}

      {/* Estadísticas por tipo con gráfico */}
      {stats && stats.by_type && stats.by_type.length > 0 && (
        <div className="analytics-section">
          <h3>Actividades por Tipo</h3>
          
          {/* Cajas de conteos en una sola fila */}
          <div className="activities-by-type-row">
            {stats.by_type.map(item => (
              <div key={item.activity_type} className="activity-type-item">
                <span className="activity-type-label">{getActivityTypeLabel(item.activity_type)}</span>
                <span className="activity-type-count">{item.count}</span>
              </div>
            ))}
          </div>
          
          {/* Gráficas lado a lado */}
          <div className="activities-charts-layout">
            {/* Gráfica Pie a la izquierda */}
            <div className="activities-chart-section">
              <div className="chart-container">
                <Pie
                  data={{
                    labels: stats.by_type.map(item => getActivityTypeLabel(item.activity_type)),
                    datasets: [
                      {
                        label: 'Actividades',
                        data: stats.by_type.map(item => item.count),
                        backgroundColor: stats.by_type.map(item => getActivityTypeColor(item.activity_type)),
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        align: 'center'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed}`;
                          }
                        }
                      },
                      datalabels: {
                        color: '#333',
                        font: {
                          weight: 'bold',
                          size: 14
                        },
                        formatter: (value, context) => {
                          return value;
                        },
                        backgroundColor: 'white',
                        borderColor: '#555',
                        borderRadius: 10,
                        borderWidth: 2,
                        padding: 6
                      }
                    }
                  }}
                  plugins={[ChartDataLabels]}
                />
              </div>
            </div>
            
            {/* Gráfica de barras a la derecha */}
            <div className="activities-chart-section">
              <div className="chart-container-medium">
            <Bar
              data={{
                labels: [...stats.by_type]
                  .sort((a, b) => b.count - a.count)
                  .map(item => getActivityTypeLabel(item.activity_type)),
                datasets: [
                  {
                    label: 'Cantidad de Actividades',
                    data: [...stats.by_type]
                      .sort((a, b) => b.count - a.count)
                      .map(item => item.count),
                    backgroundColor: [...stats.by_type]
                      .sort((a, b) => b.count - a.count)
                      .map(item => getActivityTypeColor(item.activity_type)),
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.parsed.y} actividades`;
                      }
                    }
                  },
                  datalabels: {
                    anchor: (context) => {
                      // Si el valor es mayor al 90% del máximo, poner label dentro
                      const maxValue = Math.max(...context.dataset.data);
                      const currentValue = context.dataset.data[context.dataIndex];
                      if (currentValue >= maxValue * 0.9) {
                        return 'center';
                      }
                      return 'end';
                    },
                    align: (context) => {
                      const maxValue = Math.max(...context.dataset.data);
                      const currentValue = context.dataset.data[context.dataIndex];
                      if (currentValue >= maxValue * 0.9) {
                        return 'center';
                      }
                      return 'top';
                    },
                    color: '#333',
                    font: {
                      weight: 'bold',
                      size: 12
                    },
                    formatter: (value) => {
                      return value;
                    },
                    backgroundColor: 'white',
                    borderColor: '#555',
                    borderRadius: 10,
                    borderWidth: 2,
                    padding: 6
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Tipo de Actividad',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    }
                  },
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Cantidad de Actividades',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
              plugins={[ChartDataLabels]}
            />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas por día con gráfico de barras apiladas */}
      {dailyChartData && (
        <div className="analytics-section">
          <h3>Actividades por Día</h3>
          <div className="chart-container-large">
            <Bar
              data={dailyChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                  datalabels: {
                    anchor: 'center',
                    align: 'center',
                    formatter: (value, context) => {
                      // Mostrar valor solo si es mayor a 0
                      if (value > 0) {
                        return value;
                      }
                      return '';
                    },
                    color: '#333',
                    font: {
                      weight: 'bold',
                      size: 11
                    },
                    backgroundColor: 'white',
                    borderColor: '#555',
                    borderRadius: 10,
                    borderWidth: 2,
                    padding: 4
                  }
                },
                scales: {
                  x: {
                    stacked: true,
                    title: {
                      display: true,
                      text: 'Fecha',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    }
                  },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Cantidad de Actividades',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
              plugins={[ChartDataLabels]}
            />
          </div>
        </div>
      )}

      {/* Estadísticas por usuario con datatable y gráfico */}
      {stats && stats.by_user && stats.by_user.length > 0 && (
        <div className="analytics-section">
          <h3>Actividades por Usuario</h3>
          <div className="user-activities-layout">
            <div className="user-activities-table-section">
              <div className="user-activities-search-container">
                <input
                  type="text"
                  placeholder="🔍 Buscar por usuario o email..."
                  value={userActivitiesSearch}
                  onChange={(e) => {
                    setUserActivitiesSearch(e.target.value);
                    setUserActivitiesPage(1);
                  }}
                  className="user-activities-search-input"
                />
                {userActivitiesSearch && (
                  <span className="user-activities-search-count">
                    {filteredUserActivities.length} resultados
                  </span>
                )}
              </div>
              <div className="user-activities-table-container">
                <table className="user-activities-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Email</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUserActivities.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.username || '-'}</td>
                        <td>{item.email || '-'}</td>
                        <td>{getActivityTypeLabel(item.activity_type)}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalUserActivitiesPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setUserActivitiesPage(p => Math.max(1, p - 1))}
                    disabled={userActivitiesPage === 1}
                    className="pagination-button"
                  >
                    ← Anterior
                  </button>
                  <span className="pagination-info">
                    Página {userActivitiesPage} de {totalUserActivitiesPages}
                  </span>
                  <button
                    onClick={() => setUserActivitiesPage(p => Math.min(totalUserActivitiesPages, p + 1))}
                    disabled={userActivitiesPage === totalUserActivitiesPages}
                    className="pagination-button"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
            {userChartData && (
              <div className="user-activities-chart-section">
                <h4>Top 10 Usuarios</h4>
                <div className="chart-container-medium">
                  <Bar
                    data={userChartData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.parsed.x} actividades`;
                            }
                          }
                        },
                        datalabels: {
                          anchor: (context) => {
                            // Si el valor es mayor al 90% del máximo, poner label dentro
                            const maxValue = Math.max(...context.dataset.data);
                            const currentValue = context.dataset.data[context.dataIndex];
                            if (currentValue >= maxValue * 0.9) {
                              return 'center';
                            }
                            return 'end';
                          },
                          align: (context) => {
                            const maxValue = Math.max(...context.dataset.data);
                            const currentValue = context.dataset.data[context.dataIndex];
                            if (currentValue >= maxValue * 0.9) {
                              return 'center';
                            }
                            return 'right';
                          },
                          color: '#333',
                          font: {
                            weight: 'bold',
                            size: 11
                          },
                          formatter: (value) => {
                            return value;
                          },
                          backgroundColor: 'white',
                          borderColor: '#555',
                          borderRadius: 10,
                          borderWidth: 2,
                          padding: 4
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Cantidad de Actividades',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Usuario',
                            font: {
                              size: 14,
                              weight: 'bold'
                            }
                          }
                        }
                      }
                    }}
                    plugins={[ChartDataLabels]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registro de actividades recientes con datatable */}
      <div className="analytics-section">
        <h3>Registro de Actividades Recientes</h3>
        <div className="recent-activities-search-container">
          <input
            type="text"
            placeholder="🔍 Buscar por usuario, tipo o sector..."
            value={recentActivitiesSearch}
            onChange={(e) => {
              setRecentActivitiesSearch(e.target.value);
              setRecentActivitiesPage(1);
            }}
            className="recent-activities-search-input"
          />
          {recentActivitiesSearch && (
            <span className="recent-activities-search-count">
              {filteredRecentActivities.length} resultados
            </span>
          )}
        </div>
        <div className="activities-table-container">
          <table className="activities-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Detalles</th>
                <th>Tipo de Datos</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecentActivities.map(activity => {
                const isMock = activity.activity_data?.isMock || false;
                return (
                  <tr key={activity.id} className={isMock ? 'mock-data-row' : ''}>
                    <td>{activity.username}</td>
                    <td>{getActivityTypeLabel(activity.activity_type)}</td>
                    <td>{new Date(activity.created_at).toLocaleString('es-CO')}</td>
                    <td>
                      {activity.activity_data && (
                        <span 
                          className={`activity-details ${activity.activity_type === 'search' && activity.activity_data.search_id ? 'clickable' : ''}`}
                          onClick={() => handleSearchDetailsClick(activity)}
                          style={activity.activity_type === 'search' && activity.activity_data.search_id ? { cursor: 'pointer', textDecoration: 'underline' } : {}}
                        >
                          {activity.activity_type === 'search' && activity.activity_data.sector && (
                            <>Sector: {activity.activity_data.sector} ({activity.activity_data.results_count || 0} resultados)</>
                          )}
                        </span>
                      )}
                    </td>
                    <td>
                      {isMock ? (
                        <span className="mock-data-label">📋 Datos de Prueba</span>
                      ) : activity.activity_type === 'search' ? (
                        <span className="real-data-label">✅ Datos Reales</span>
                      ) : (
                        <span className="no-data-label">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalRecentActivitiesPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setRecentActivitiesPage(p => Math.max(1, p - 1))}
              disabled={recentActivitiesPage === 1}
              className="pagination-button"
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {recentActivitiesPage} de {totalRecentActivitiesPages}
            </span>
            <button
              onClick={() => setRecentActivitiesPage(p => Math.min(totalRecentActivitiesPages, p + 1))}
              disabled={recentActivitiesPage === totalRecentActivitiesPages}
              className="pagination-button"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {/* Modal de resultados de búsqueda */}
      <SearchResultsModal
        isOpen={searchResultsModal.isOpen}
        searchId={searchResultsModal.searchId}
        sector={searchResultsModal.sector}
        onClose={() => setSearchResultsModal({ ...searchResultsModal, isOpen: false })}
        searchResultsData={searchResultsData}
        isLoading={searchResultsLoading}
      />
    </div>
  );
}

// Componente para mostrar el estado del API
function ApiStatusDisplay({ status }) {
  const usageStats = status.usageStats || {};
  const rateLimitRemaining = usageStats.rateLimitRemaining;
  const rateLimitLimit = usageStats.rateLimitLimit;
  const rateLimitUsed = rateLimitLimit && rateLimitRemaining !== null 
    ? rateLimitLimit - rateLimitRemaining 
    : null;
  const usagePercentage = rateLimitLimit && rateLimitRemaining !== null
    ? ((rateLimitUsed / rateLimitLimit) * 100).toFixed(1)
    : null;

  const getStatusColor = () => {
    if (status.isExceeded) return '#ea4335'; // Rojo
    if (usagePercentage !== null) {
      if (usagePercentage >= 90) return '#fbbc04'; // Amarillo
      if (usagePercentage >= 75) return '#ff9800'; // Naranja
    }
    return '#34a853'; // Verde
  };

  const getStatusText = () => {
    if (status.isExceeded) return 'Límite Excedido - Usando Mock Data';
    if (!status.hasBearerToken) return 'Token no configurado';
    if (usagePercentage === null) return 'Estado Desconocido';
    if (usagePercentage >= 90) return 'Casi Agotado';
    if (usagePercentage >= 75) return 'Alto Uso';
    return 'Normal';
  };

  return (
    <div className="api-status-container">
      <div className={`api-status-card ${status.isExceeded ? 'exceeded' : ''}`}>
        <div className="api-status-header">
          <h3>Estado General</h3>
          <span className={`api-status-badge ${status.isExceeded ? 'exceeded' : 'normal'}`}>
            {getStatusText()}
          </span>
        </div>
        
        {status.isExceeded && (
          <div className="api-status-alert">
            <p>⚠️ El límite del API ha sido excedido. El sistema está usando datos mock.</p>
            {status.timeUntilResetMinutes !== null && (
              <p>
                <strong>Tiempo hasta reset:</strong> {status.timeUntilResetMinutes} minutos
                {status.exceededUntil && (
                  <> (hasta {new Date(status.exceededUntil).toLocaleString('es-CO')})</>
                )}
              </p>
            )}
          </div>
        )}

        {!status.hasBearerToken && (
          <div className="api-status-warning">
            <p>⚠️ El Bearer Token de Twitter no está configurado. El sistema usará datos mock.</p>
          </div>
        )}

        {rateLimitLimit !== null && rateLimitRemaining !== null && (
          <div className="api-usage-section">
            <h4>Uso del Rate Limit</h4>
            <div className="api-usage-stats">
              <div className="api-usage-item">
                <span className="api-usage-label">Límite:</span>
                <span className="api-usage-value">{rateLimitLimit.toLocaleString()}</span>
              </div>
              <div className="api-usage-item">
                <span className="api-usage-label">Usado:</span>
                <span className="api-usage-value" style={{ color: getStatusColor() }}>
                  {rateLimitUsed?.toLocaleString() || 'N/A'}
                </span>
              </div>
              <div className="api-usage-item">
                <span className="api-usage-label">Disponible:</span>
                <span className="api-usage-value" style={{ color: getStatusColor() }}>
                  {rateLimitRemaining.toLocaleString()}
                </span>
              </div>
              <div className="api-usage-item">
                <span className="api-usage-label">Porcentaje usado:</span>
                <span className="api-usage-value" style={{ color: getStatusColor() }}>
                  {usagePercentage !== null ? `${usagePercentage}%` : 'N/A'}
                </span>
              </div>
            </div>
            
            {usagePercentage !== null && (
              <div className="api-usage-bar-container">
                <div 
                  className="api-usage-bar" 
                  style={{ 
                    width: `${usagePercentage}%`,
                    backgroundColor: getStatusColor()
                  }}
                />
              </div>
            )}

            {usageStats.rateLimitReset && (
              <p className="api-reset-time">
                <strong>Reset del límite:</strong> {new Date(usageStats.rateLimitReset).toLocaleString('es-CO')}
              </p>
            )}
          </div>
        )}

        <div className="api-stats-section">
          <h4>Estadísticas de Uso</h4>
          <div className="api-stats-grid">
            <div className="api-stat-item">
              <span className="api-stat-label">Total de Requests:</span>
              <span className="api-stat-value">{usageStats.totalRequests || 0}</span>
            </div>
            <div className="api-stat-item">
              <span className="api-stat-label">Requests Exitosos:</span>
              <span className="api-stat-value" style={{ color: '#34a853' }}>
                {usageStats.successfulRequests || 0}
              </span>
            </div>
            <div className="api-stat-item">
              <span className="api-stat-label">Requests Fallidos:</span>
              <span className="api-stat-value" style={{ color: '#ea4335' }}>
                {usageStats.failedRequests || 0}
              </span>
            </div>
            {usageStats.lastRequestTime && (
              <div className="api-stat-item">
                <span className="api-stat-label">Última Request:</span>
                <span className="api-stat-value">
                  {new Date(usageStats.lastRequestTime).toLocaleString('es-CO')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para modal de resultados de búsqueda
function SearchResultsModal({ isOpen, searchId, sector, onClose, searchResultsData, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="search-results-modal-overlay" onClick={onClose}>
      <div className="search-results-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="search-results-modal-header">
          <h2>Resultados de Búsqueda</h2>
          <button
            className="search-results-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="search-results-modal-body">
          {isLoading ? (
            <div className="search-results-loading">
              <p>Cargando resultados...</p>
            </div>
          ) : searchResultsData?.results ? (
            <>
              <div className={`search-results-info ${searchResultsData.results.isMock ? 'mock-data' : ''}`}>
                <p><strong>Sector:</strong> {sector}</p>
                {searchResultsData.results.coordinates && (
                  <>
                    <p>
                      <strong>Coordenadas:</strong> {searchResultsData.results.coordinates.lat.toFixed(4)}, {searchResultsData.results.coordinates.lng.toFixed(4)}
                    </p>
                    <LocationMap 
                      coordinates={searchResultsData.results.coordinates} 
                      sector={sector}
                      incidents={searchResultsData.results.incidents || []}
                    />
                  </>
                )}
                <p><strong>Fecha:</strong> {new Date(searchResultsData.search.search_date).toLocaleString('es-CO')}</p>
                <p>
                  <strong>Total de resultados:</strong> {searchResultsData.results.incidents?.length || 0}
                  {searchResultsData.results.isMock && (
                    <span className="mock-badge">📋 Datos de ejemplo</span>
                  )}
                </p>
              </div>
              {searchResultsData.results.incidents && searchResultsData.results.incidents.length > 0 ? (
                <div className="search-results-list">
                  <IncidentList incidents={searchResultsData.results.incidents} isMock={searchResultsData.results.isMock || false} />
                </div>
              ) : (
                <div className={`search-results-empty ${searchResultsData.results.isMock ? 'mock-data' : ''}`}>
                  <p>
                    No se encontraron resultados para esta búsqueda.
                    {searchResultsData.results.isMock && (
                      <span className="mock-badge">📋 Datos de ejemplo</span>
                    )}
                  </p>
                  {searchResultsData.results.isMock && (
                    <p className="search-results-empty-note">
                      No se pudo conectar con las fuentes de datos o se alcanzó el límite de la API. Se muestran datos de ejemplo.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="search-results-error">
              <p>Error al cargar los resultados de la búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para configuración del sistema
function SystemConfig({ config, onUpdate, isUpdating }) {
  const twitterDataSource = config.twitter_data_source?.value || 'api';
  const [deepseekApiKey, setDeepseekApiKey] = useState(config.deepseek_api_key?.value || '');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleDataSourceChange = (newValue) => {
    onUpdate('twitter_data_source', newValue, 'Método de obtención de tweets: "api" para Twitter API v2, "scraping" para scraping directo');
  };

  const handleDeepseekApiKeyChange = (e) => {
    const newValue = e.target.value;
    setDeepseekApiKey(newValue);
    onUpdate('deepseek_api_key', newValue, 'API KEY de DeepSeek para validación de IA de reportes de movilidad');
  };

  return (
    <div className="system-config-container">
      <div className="config-card">
        <div className="config-header">
          <h3>📡 Método de Obtención de Tweets</h3>
          <p className="config-description">
            Elige cómo obtener los tweets de las cuentas oficiales de Twitter/X
          </p>
        </div>

        <div className="config-options">
          <div className={`config-option ${twitterDataSource === 'api' ? 'active' : ''}`}>
            <div className="option-header">
              <input
                type="radio"
                id="data-source-api"
                name="data-source"
                value="api"
                checked={twitterDataSource === 'api'}
                onChange={() => handleDataSourceChange('api')}
                disabled={isUpdating}
              />
              <label htmlFor="data-source-api">
                <strong>🔌 Twitter API v2</strong>
              </label>
            </div>
            <div className="option-content">
              <p>Usa la API oficial de Twitter/X para obtener tweets.</p>
              <ul className="option-features">
                <li>✅ Datos oficiales y confiables (recomendado para pruebas reales)</li>
                <li>✅ Información completa (métricas, fechas exactas)</li>
                <li>✅ Plan gratuito: 100 posts/mes (suficiente para pruebas iniciales)</li>
                <li>✅ Cache optimizado a 24 horas para minimizar uso del API</li>
                <li>⚠️ Requiere Bearer Token (gratis en developer.twitter.com)</li>
                <li>⚠️ Costos elevados en planes pagos ($175-$5000/mes) - solo cuando haya monetización</li>
              </ul>
              {twitterDataSource === 'api' && (
                <div className="option-status">
                  <span className="status-badge active">Activo</span>
                </div>
              )}
            </div>
          </div>

          <div className={`config-option ${twitterDataSource === 'scraping' ? 'active' : ''}`}>
            <div className="option-header">
              <input
                type="radio"
                id="data-source-scraping"
                name="data-source"
                value="scraping"
                checked={twitterDataSource === 'scraping'}
                onChange={() => handleDataSourceChange('scraping')}
                disabled={isUpdating}
              />
              <label htmlFor="data-source-scraping">
                <strong>🔍 Scraping Directo</strong>
              </label>
            </div>
            <div className="option-content">
              <p>Obtiene tweets mediante scraping directo de X/Twitter usando Nitter.</p>
              <ul className="option-features">
                <li>✅ Sin límites de rate limit</li>
                <li>✅ Sin costos adicionales</li>
                <li>✅ No requiere API key</li>
                <li>⚠️ Depende de instancias de Nitter disponibles</li>
                <li>⚠️ Puede ser más lento que el API</li>
                <li>⚠️ Menos información (sin métricas detalladas)</li>
              </ul>
              {twitterDataSource === 'scraping' && (
                <div className="option-status">
                  <span className="status-badge active">Activo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isUpdating && (
          <div className="config-updating">
            <p>⏳ Actualizando configuración...</p>
          </div>
        )}

        <div className="config-note">
          <p>
            <strong>Recomendación para pruebas reales:</strong> Usa "Twitter API v2" con el plan gratuito (100 posts/mes).
            El sistema está optimizado para minimizar el uso del API:
          </p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
            <li>Cache extendido a 24 horas (los tweets se reutilizan durante 24 horas)</li>
            <li>Uso inteligente del API (solo cuando el cache está vacío o muy antiguo)</li>
            <li>Máximo de tweets por request (100 tweets por llamada al API)</li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            <strong>Obtener Bearer Token gratis:</strong> Ve a <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer">developer.twitter.com</a>, 
            crea una app y genera un Bearer Token. Es completamente gratis para el plan básico (100 posts/mes).
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>Nota:</strong> Los cambios se aplicarán inmediatamente. 
            El sistema usará el método seleccionado para obtener tweets en las próximas consultas.
          </p>
        </div>
      </div>

      {/* Configuración de DeepSeek AI */}
      <div className="config-card" style={{ marginTop: '2rem' }}>
        <div className="config-header">
          <h3>🤖 Validación de IA con DeepSeek</h3>
          <p className="config-description">
            Configura la API KEY de DeepSeek para validar y analizar reportes de movilidad con inteligencia artificial
          </p>
        </div>

        <div className="config-input-group">
          <label htmlFor="deepseek-api-key">
            <strong>🔑 API KEY de DeepSeek</strong>
          </label>
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="deepseek-api-key"
              value={deepseekApiKey}
              onChange={handleDeepseekApiKeyChange}
              placeholder="sk-..."
              disabled={isUpdating}
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '3rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: '0.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--text-secondary)'
              }}
              title={showApiKey ? 'Ocultar' : 'Mostrar'}
            >
              {showApiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            La validación de IA analiza cada reporte de movilidad para:
          </p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <li>✅ Determinar si es un incidente real de movilidad</li>
            <li>✅ Identificar el tipo de incidente (manifestación, accidente, obra, desvío)</li>
            <li>✅ Evaluar qué puede afectar (tránsito, rutas, transporte público)</li>
            <li>✅ Vincular el reporte con la búsqueda del usuario</li>
            <li>✅ Extraer ubicaciones mencionadas en el texto</li>
            <li>✅ Evaluar la severidad del incidente</li>
          </ul>
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <strong>Obtener API KEY de DeepSeek:</strong> Ve a <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a>, 
            crea una cuenta y genera una API KEY. El plan gratuito incluye créditos para pruebas.
          </p>
          {deepseekApiKey && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--background-secondary)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                ✅ API KEY configurada. La validación de IA se ejecutará automáticamente después del scraping.
              </p>
            </div>
          )}
          {!deepseekApiKey && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <p style={{ fontSize: '0.875rem', color: '#856404', margin: 0 }}>
                ⚠️ API KEY no configurada. La validación de IA se omitirá y se usarán los métodos tradicionales de clasificación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
