import { useEffect, useRef, type ReactNode } from 'react';
import { Scissors, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface Props {
  children: ReactNode;
  onClose: () => void;
}

export function BookingSheet({ children, onClose }: Props) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label="Agendamento">
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={isMobile ? 'sheet-panel sheet-mobile' : 'sheet-panel sheet-desktop'}
        ref={panelRef}
        tabIndex={-1}
      >
        {isMobile && <div className="sheet-handle" aria-hidden="true" />}

        <div className="sheet-header">
          <div className="sheet-heading">
            <span className="sheet-heading-icon" aria-hidden="true">
              <Scissors size={18} />
            </span>
            <div>
              <p className="eyebrow small">Alcateia Barber</p>
              <h2 className="sheet-title">Agendamento</h2>
            </div>
          </div>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="Fechar agendamento"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}