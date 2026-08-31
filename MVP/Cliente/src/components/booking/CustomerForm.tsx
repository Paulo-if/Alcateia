import { useEffect } from 'react';
import { maskPhone } from '../../lib/phone';

interface Props {
  clientName: string;
  clientPhone: string;
  onChange: (patch: { clientName?: string; clientPhone?: string }) => void;
  showError?: string | null;
}

export function CustomerForm({ clientName, clientPhone, onChange, showError }: Props) {
  useEffect(() => {
    if (showError && typeof document !== 'undefined') {
      const el = document.querySelector<HTMLElement>('[data-field="customer"]');
      el?.focus();
    }
  }, [showError]);

  return (
    <div className="form-grid" data-field="customer">
      {showError && <div className="alert error" role="alert">{showError}</div>}

      <label>
        <span>Nome</span>
        <input
          value={clientName}
          onChange={(e) => onChange({ clientName: e.target.value })}
          placeholder="Seu nome"
          autoComplete="name"
        />
      </label>

      <label>
        <span>WhatsApp</span>
        <input
          value={clientPhone}
          onChange={(e) => onChange({ clientPhone: maskPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          autoComplete="tel"
          name="phone"
          maxLength={15}
        />
      </label>

      <p className="empty-hint" style={{ margin: 0 }}>
        Usaremos o WhatsApp apenas para confirmar seu horário.
      </p>
    </div>
  );
}