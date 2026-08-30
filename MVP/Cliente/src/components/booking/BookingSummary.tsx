import type { Professional, Service } from '../../types';
import { formatCurrency, formatDateBR } from '../../lib/date';

interface Props {
  professional: Professional | null;
  service: Service | null;
  date: string;
  time: string;
  subtotal: number;
  bumpAmount: number;
  bumpMinutes?: number;
}

export function BookingSummary({
  professional,
  service,
  date,
  time,
  subtotal,
  bumpAmount,
  bumpMinutes = 0,
}: Props) {
  const total = subtotal + bumpAmount;
  const durationMinutes = (service?.duracao_minutos ?? 0) + bumpMinutes;
  const professionalName = professional?.name ?? 'A definir (qualquer profissional)';

  return (
    <div className="receipt">
      <div className="receipt-head">
        <p>Resumo</p>
        <span className="receipt-badge">Alcateia</span>
      </div>

      <div className="receipt-rule" />

      <dl className="receipt-rows">
        <div className="receipt-row">
          <dt className="k">Serviço</dt>
          <dd className="v service-value">
            <span>{service?.nome ?? '—'}</span>
            <strong>{service ? formatCurrency(service.preco) : ''}</strong>
          </dd>
        </div>
        <div className="receipt-row">
          <dt className="k">Profissional</dt>
          <dd className="v">{professionalName}</dd>
        </div>
        <div className="receipt-row">
          <dt className="k">Data</dt>
          <dd className="v">{formatDateBR(date)}</dd>
        </div>
        <div className="receipt-row">
          <dt className="k">Horário</dt>
          <dd className="v">{time}</dd>
        </div>
        <div className="receipt-row">
          <dt className="k">Duração</dt>
          <dd className="v">{durationMinutes} min</dd>
        </div>
        {bumpAmount > 0 && (
          <div className="receipt-row">
            <dt className="k">Oferta especial</dt>
            <dd className="v">{formatCurrency(bumpAmount)}</dd>
          </div>
        )}
      </dl>

      <div className="receipt-rule" />

      <div className="receipt-total">
        <span className="k">Total</span>
        <span className="v">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}