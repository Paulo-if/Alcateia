import { Sparkles } from 'lucide-react';
import type { BumpOffer } from '../../types';
import { formatCurrency } from '../../lib/date';

interface Props {
  bump: BumpOffer | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function OrderBumpCard({ bump, onAccept, onDecline }: Props) {
  if (!bump) {
    return (
      <div className="bump-card">
        <p className="bump-desc">Nenhuma oferta disponível no momento.</p>
        <div className="bump-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onDecline}>
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bump-card">
      <div className="bump-badge">
        <Sparkles size={16} />
        <span>Uma oferta especial</span>
      </div>

      <h3>{bump.name}</h3>
      {bump.description && <p className="bump-desc">{bump.description}</p>}
      {bump.type === 'micro_service' && (
        <p className="bump-desc">Adiciona {bump.additionalMinutes} min ao seu horário.</p>
      )}

      <div className="bump-price">
        {bump.originalPrice !== undefined && bump.originalPrice > bump.price && (
          <>
            <s>{formatCurrency(bump.originalPrice)}</s>
            <strong>por {formatCurrency(bump.price)}</strong>
          </>
        )}
        {!(bump.originalPrice !== undefined && bump.originalPrice > bump.price) && (
          <strong>{formatCurrency(bump.price)}</strong>
        )}
      </div>

      <div className="bump-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onAccept}>
          Aproveitar oferta
        </button>
        <button type="button" className="bump-decline" onClick={onDecline}>
          Continuar sem a oferta
        </button>
      </div>
    </div>
  );
}