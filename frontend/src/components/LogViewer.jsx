import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';
import './LogViewer.css';

function LogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 620, y: window.innerHeight - 520 });
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [clearTimestamp, setClearTimestamp] = useState(0); // Timestamp para limpiar logs (0 = mostrar todos)
  const [clearedLogIds, setClearedLogIds] = useState(new Set()); // IDs de logs que han sido limpiados
  const [showClearConfirm, setShowClearConfirm] = useState(false); // Modal de confirmación para limpiar
  const [showMessageModal, setShowMessageModal] = useState(false); // Modal para mensajes de éxito/error
  const [messageModalData, setMessageModalData] = useState({ type: 'success', message: '' }); // Datos del modal de mensaje
  const logContainerRef = useRef(null);
  const containerRef = useRef(null);
  const headerRef = useRef(null);

  // Query para obtener logs cada 2 segundos
  // Usar clearTimestamp en la queryKey para forzar refresh cuando se limpia
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['backend-logs', clearTimestamp],
    queryFn: async () => {
      // Si clearTimestamp es 0, obtener todos los logs
      // Si no, obtener solo logs desde clearTimestamp
      const params = clearTimestamp > 0 
        ? { since: new Date(clearTimestamp).toISOString() }
        : {};
      
      const response = await api.get('/api/admin/logs', { params });
      return response.data;
    },
    refetchInterval: isOpen ? 2000 : false, // Actualizar cada 2 segundos solo si está abierto
    enabled: isOpen, // Solo hacer query si está abierto
  });

  const logs = logsData?.logs || [];
  const [userScrolled, setUserScrolled] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Filtrar logs que han sido limpiados
  const filteredLogs = logs.filter(log => !clearedLogIds.has(log.id));

  // Ordenar logs por timestamp
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    try {
      return new Date(a.timestamp) - new Date(b.timestamp);
    } catch {
      return 0;
    }
  });

  // Detectar si el usuario está al final del scroll
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px de margen
      setIsAtBottom(atBottom);
      setUserScrolled(!atBottom);
    }
  };

  // Auto-scroll al final solo si el usuario está al final
  useEffect(() => {
    if (logContainerRef.current && !isMinimized && isAtBottom) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [sortedLogs, isMinimized, isAtBottom]);

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      // Mostrar solo la hora en formato local
      return date.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  const getLogLevel = (content) => {
    const lower = content.toLowerCase();
    if (lower.includes('error') || lower.includes('❌')) return 'error';
    if (lower.includes('warn') || lower.includes('⚠️')) return 'warn';
    if (lower.includes('success') || lower.includes('✅')) return 'success';
    if (lower.includes('info') || lower.includes('🔍') || lower.includes('📊')) return 'info';
    return 'default';
  };

  // Manejar inicio de drag
  const handleDragStart = (e) => {
    // No iniciar drag si se hace click en un botón o en un elemento interactivo
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    
    // Solo iniciar drag si se hace click en el header (no en botones)
    if (headerRef.current && (e.target === headerRef.current || headerRef.current.contains(e.target))) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Manejar drag
  useEffect(() => {
    const handleDrag = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Limitar dentro de la ventana
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - (isMinimized ? 48 : size.height);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, dragStart, position, size, isMinimized]);

  // Manejar inicio de resize
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // Manejar resize
  useEffect(() => {
    const handleResize = (e) => {
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = size.width;
        let newHeight = size.height;
        let newX = position.x;
        let newY = position.y;

        // Resize según dirección
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(300, Math.min(resizeStart.width + deltaX, window.innerWidth - position.x));
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(300, Math.min(resizeStart.width - deltaX, position.x + size.width));
          newX = Math.max(0, position.x + (size.width - newWidth));
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(200, Math.min(resizeStart.height + deltaY, window.innerHeight - position.y));
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(200, Math.min(resizeStart.height - deltaY, position.y + size.height));
          newY = Math.max(0, position.y + (size.height - newHeight));
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeDirection, resizeStart, size, position]);

  // Manejar maximizar
  const handleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setSize({ width: 600, height: 500 });
      setPosition({ x: window.innerWidth - 620, y: window.innerHeight - 520 });
    } else {
      setIsMaximized(true);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
  };

  // Manejar enviar al log
  const handleSendToLog = async () => {
    try {
      const logText = sortedLogs.map(log => {
        const timestamp = formatTimestamp(log.timestamp);
        return `[${timestamp}] ${log.content}`;
      }).join('\n');

      await api.post('/api/admin/logs', { content: logText });
      setMessageModalData({
        type: 'success',
        message: '✅ Logs enviados exitosamente al archivo consola_backend.log'
      });
      setShowMessageModal(true);
    } catch (error) {
      console.error('Error enviando logs:', error);
      setMessageModalData({
        type: 'danger',
        message: '❌ Error al enviar logs: ' + (error.response?.data?.message || error.message)
      });
      setShowMessageModal(true);
    }
  };

  // Manejar clear de logs
  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    // Marcar todos los logs actuales como limpiados
    const currentLogIds = new Set(logs.map(log => log.id));
    setClearedLogIds(currentLogIds);
    setClearTimestamp(Date.now()); // Actualizar timestamp para filtrar logs antiguos
    // Scroll al final después de limpiar
    if (logContainerRef.current) {
      setTimeout(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }, 100);
    }
    setShowClearConfirm(false);
  };

  // Limpiar logs cuando se abre el modal por primera vez o se hace refresh
  useEffect(() => {
    if (isOpen) {
      // Cuando se abre el modal, establecer timestamp actual para mostrar solo logs nuevos
      setClearTimestamp(Date.now());
      // Limpiar el set de logs limpiados cuando se abre el modal
      setClearedLogIds(new Set());
    }
  }, [isOpen]);

  // Resetear clearTimestamp cuando se cierra el modal
  const handleClose = () => {
    setIsOpen(false);
    // Resetear para que la próxima vez que se abra, muestre logs desde ese momento
    setClearTimestamp(Date.now());
    // Limpiar el set de logs limpiados
    setClearedLogIds(new Set());
  };

  if (!isOpen) {
    return (
      <button 
        className="log-viewer-toggle"
        onClick={() => setIsOpen(true)}
        title="Ver logs del backend"
      >
        📋 Logs
      </button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`log-viewer-container ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? '48px' : `${size.height}px`
      }}
    >
      <div 
        ref={headerRef}
        className="log-viewer-header"
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="log-viewer-title">
          <span>📋 Logs del Backend</span>
          {logsData && (
            <span className="log-viewer-count">
              ({logsData.showing || 0} líneas)
            </span>
          )}
        </div>
        <div className="log-viewer-actions">
          <button
            className="log-viewer-btn"
            onClick={handleClear}
            title="Limpiar logs del visor"
          >
            🗑️
          </button>
          <button
            className="log-viewer-btn"
            onClick={handleSendToLog}
            title="Enviar al archivo de log"
          >
            💾
          </button>
          <button
            className="log-viewer-btn"
            onClick={handleMaximize}
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>
          <button
            className="log-viewer-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button
            className="log-viewer-btn"
            onClick={handleClose}
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div 
          className="log-viewer-content" 
          ref={logContainerRef}
          onScroll={handleScroll}
        >
          {isLoading && sortedLogs.length === 0 ? (
            <div className="log-viewer-loading">Cargando logs...</div>
          ) : sortedLogs.length === 0 ? (
            <div className="log-viewer-empty">No hay logs disponibles</div>
          ) : (
            <div className="log-viewer-logs">
              {sortedLogs.map((log) => {
                const level = getLogLevel(log.content);
                return (
                  <div key={log.id} className={`log-viewer-line log-${level}`}>
                    <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                    <span className="log-content">{log.content}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Resize handles */}
      {!isMinimized && !isMaximized && (
        <>
          {/* Esquinas */}
          <div 
            className="resize-handle resize-handle-top-left"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div 
            className="resize-handle resize-handle-top-right"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div 
            className="resize-handle resize-handle-bottom-left"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div 
            className="resize-handle resize-handle-bottom-right"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
          {/* Lados */}
          <div 
            className="resize-handle resize-handle-top"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div 
            className="resize-handle resize-handle-right"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
          <div 
            className="resize-handle resize-handle-bottom"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div 
            className="resize-handle resize-handle-left"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
        </>
      )}

      {/* Modal de confirmación para limpiar logs */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClear}
        title="Limpiar logs del visor"
        message="¿Estás seguro de que quieres limpiar los logs del visor?"
        confirmText="Aceptar"
        cancelText="Cancelar"
        type="warning"
      />

      {/* Modal para mensajes de éxito/error */}
      <ConfirmModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onConfirm={() => setShowMessageModal(false)}
        title={messageModalData.type === 'success' ? 'Éxito' : 'Error'}
        message={messageModalData.message}
        confirmText="Aceptar"
        cancelText={null}
        type={messageModalData.type}
      />
    </div>
  );
}

export default LogViewer;

