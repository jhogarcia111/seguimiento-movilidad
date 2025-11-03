import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import './AdminDashboardPage.css';

function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('sources');
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);

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

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <p>Gestión de fuentes, tags y usuarios</p>
      </div>

      <div className="admin-tabs">
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
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'sources' && (
          <div className="sources-section">
            <div className="section-header">
              <h2>Fuentes de Información</h2>
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
                onEdit={(source) => {
                  setEditingSource(source);
                  setShowSourceForm(true);
                }}
                onDeactivate={(id) => {
                  if (confirm('¿Desactivar esta fuente?')) {
                    api.delete(`/api/admin/sources/${id}`).then(() => {
                      queryClient.invalidateQueries(['admin-sources']);
                    });
                  }
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <h2>Usuarios</h2>
            {usersLoading ? (
              <p>Cargando usuarios...</p>
            ) : (
              <UsersList
                users={usersData?.users || []}
                onDeactivate={(id) => {
                  if (confirm('¿Desactivar este usuario?')) {
                    deactivateUserMutation.mutate(id);
                  }
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

// Componente para lista de fuentes
function SourcesList({ sources, onEdit, onDeactivate }) {
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

  return (
    <div className="sources-list">
      {uniqueSources.map(source => (
        <div key={`${source.id}-${source.identifier}`} className="source-card">
          <div className="source-header">
            <h3>{source.name}</h3>
            <span className={`status-badge ${source.is_active ? 'active' : 'inactive'}`}>
              {source.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div className="source-info">
            <p><strong>Tipo:</strong> {source.type}</p>
            <p><strong>Identifier:</strong> {source.identifier}</p>
            {source.description && <p>{source.description}</p>}
            {source.tags && source.tags.length > 0 && (
              <div className="source-tags">
                {source.tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="source-actions">
            <button onClick={() => onEdit(source)} className="edit-button">
              ✏️ Editar
            </button>
            <button onClick={() => onDeactivate(source.id)} className="delete-button">
              {source.is_active ? '🗑️ Desactivar' : '✅ Activar'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente para lista de usuarios
function UsersList({ users, onDeactivate }) {
  return (
    <div className="users-list">
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>
                <span className={`role-badge ${user.role}`}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                </span>
              </td>
              <td>
                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString('es-CO')}</td>
              <td>
                {user.is_active && (
                  <button onClick={() => onDeactivate(user.id)} className="delete-button">
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default AdminDashboardPage;
