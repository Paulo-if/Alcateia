import { AdminAgendaContent } from './AdminAgendaContent';
import { Modal } from '@/components/ui/Modal';

interface AdminAgendaProfissionalProps {
  open: boolean;
  onClose: () => void;
  profissional: { id: string; name: string } | null;
}

export function AdminAgendaProfissional({
  open,
  onClose,
  profissional,
}: AdminAgendaProfissionalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Agenda do Profissional" maxWidth="max-w-2xl">
      {profissional ? (
        <AdminAgendaContent
          profissional={profissional}
          onSaveSuccess={() => {}}
        />
      ) : (
        <div className="p-12 text-center text-cream/40 text-sm">
          Nenhum profissional selecionado.
        </div>
      )}
    </Modal>
  );
}