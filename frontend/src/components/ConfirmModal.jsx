import React from 'react';
import { X, AlertCircle, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirmar acción',
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  type = 'warning' // 'warning', 'danger', 'info', 'success'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="confirm-icon danger" />;
      case 'success':
        return <CheckCircle className="confirm-icon success" />;
      case 'info':
        return <AlertCircle className="confirm-icon info" />;
      default:
        return <AlertTriangle className="confirm-icon warning" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'confirm-button danger';
      case 'success':
        return 'confirm-button success';
      case 'info':
        return 'confirm-button info';
      default:
        return 'confirm-button warning';
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleBackdropClick}>
      <div className="confirm-modal">
        <button 
          className="confirm-modal-close" 
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        
        <div className="confirm-modal-header">
          <div className="confirm-icon-container">
            {getIcon()}
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>

        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>

        <div className="confirm-modal-footer">
          {cancelText && (
            <button 
              className="confirm-button cancel"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={getButtonClass()}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

