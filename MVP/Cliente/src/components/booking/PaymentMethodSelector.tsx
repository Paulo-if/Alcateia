import { CreditCard, Landmark } from 'lucide-react';
import type { PaymentMethod } from '../../types';

interface Props {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="payment-list">
      <button
        type="button"
        className={`payment-card ${value === 'online' ? 'is-selected' : ''}`}
        onClick={() => onChange('online')}
        disabled={disabled}
        aria-pressed={value === 'online'}
      >
        <CreditCard size={22} />
        <div className="payment-body">
          <strong>Pagar Agora</strong>
          <span>Pagamento online (Pix / Cartão)</span>
        </div>
      </button>

      <button
        type="button"
        className={`payment-card ${value === 'in_person' ? 'is-selected' : ''}`}
        onClick={() => onChange('in_person')}
        disabled={disabled}
        aria-pressed={value === 'in_person'}
      >
        <Landmark size={22} />
        <div className="payment-body">
          <strong>Pagar no local</strong>
          <span>Reserva sem pagamento online</span>
        </div>
      </button>
    </div>
  );
}