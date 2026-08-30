import { Sparkles, X } from 'lucide-react';
import type { UpsellOffer } from '../../types';
import { formatCurrency } from '../../lib/date';

interface Props {
  offer: UpsellOffer | null;
  onAdd: (offer: UpsellOffer) => void;
  onSkip: () => void;
  adding?: boolean;
}

export function UpsellCard({ offer, onAdd, onSkip, adding }: Props) {
  if (!offer) {
    return (
      <div className="upsell-card">
        <p className="eyebrow small">Só para você</p>
        <p className="upsell-title">Aproveite enquanto está aqui.</p>
        <p className="upsell-sub">Nenhuma oferta extra no momento. Sua reserva está garantida.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={onSkip}>
          Continuar
        </button>
      </div>
    );
  }

  return (
    <div className="upsell-card">
      <p className="eyebrow small">Só para você</p>
      <p className="upsell-title">Aproveite enquanto está aqui.</p>

      <div className="upsell-offer">
        <div className="upsell-photo">
          <Sparkles size={28} />
        </div>
        <div>
          <h3>{offer.name}</h3>
          {offer.description && <p className="bump-desc">{offer.description}</p>}
          <div className="upsell-price">
            {offer.originalPrice !== undefined && offer.originalPrice > offer.price && (
              <s>{formatCurrency(offer.originalPrice)}</s>
            )}
            <strong>{formatCurrency(offer.price)}</strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => onAdd(offer)}
        disabled={adding}
      >
        {adding ? 'Adicionando...' : `Adicionar por ${formatCurrency(offer.price)}`}
      </button>

      <button type="button" className="skip-upsell" onClick={onSkip}>
        <X size={14} />
        Não, obrigado. Quero manter minha reserva.
      </button>
    </div>
  );
}