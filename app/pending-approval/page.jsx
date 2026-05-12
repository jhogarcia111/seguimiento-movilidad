'use client';

import { useRouter } from 'next/navigation';
import { X, CheckCircle } from 'lucide-react';
import '@/components/ConfirmModal.css';
import '@/styles/PendingApprovalPage.css';

export default function PendingApprovalPage() {
  const router = useRouter();

  return (
    <div
      className="confirm-modal-overlay pending-approval-overlay"
      role="presentation"
      onClick={() => router.push('/')}
    >
      <div
        className="confirm-modal pending-approval-card"
        role="dialog"
        aria-labelledby="pending-approval-title"
        aria-describedby="pending-approval-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => router.push('/')}
          className="confirm-modal-close"
          aria-label="Cerrar y volver a inicio"
        >
          <X size={20} />
        </button>

        <div className="confirm-modal-header">
          <div className="confirm-icon-container">
            <CheckCircle className="confirm-icon success" aria-hidden />
          </div>
          <h3 id="pending-approval-title" className="confirm-modal-title">
            ¡Inscripción recibida!
          </h3>
        </div>

        <div className="confirm-modal-body">
          <p id="pending-approval-desc" className="confirm-modal-message">
            Tu solicitud de registro ha sido recibida exitosamente. Estamos validando tu
            información y te notificaremos cuando tu cuenta esté activa.
          </p>
          <p className="pending-approval-note">
            Cuando un administrador active tu cuenta, podrás iniciar sesión y usar la búsqueda por
            sector o dirección en Bogotá.
          </p>
        </div>

        <div className="confirm-modal-footer">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="confirm-button success"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
