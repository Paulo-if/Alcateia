import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-red-900/30 flex items-center justify-center shrink-0">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <p className="text-sm text-cream/70 leading-relaxed pt-1.5">{message}</p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded-xl text-sm font-medium text-cream/70 hover:text-cream hover:bg-white/5 transition-colors"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
