import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { BumpOffer } from '../../types';
import { formatCurrency } from '../../lib/date';

interface Props {
  offers: BumpOffer[];
  onAccept: (offer: BumpOffer) => void;
  onDecline: () => void;
}

export function OrderBumpCard({ offers, onAccept, onDecline }: Props) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!offers || offers.length === 0) {
    return (
      <div className="bump-card">
        <p className="bump-desc">Nenhuma oferta disponível no momento.</p>
        <div className="bump-actions bump-actions-row">
          <button type="button" className="btn btn-secondary" onClick={onDecline}>
            Continuar sem oferta
          </button>
        </div>
      </div>
    );
  }

  const total = offers.length;
  const current = Math.min(active, total - 1);
  const offer = offers[current];

  const scrollTo = (index: number) => {
    const next = Math.max(0, Math.min(index, total - 1));
    setActive(next);
    trackRef.current?.scrollTo({ left: next * trackRef.current.clientWidth, behavior: 'smooth' });
  };

  const go = (dir: -1 | 1) => scrollTo(current + dir);

  return (
    <div className="bump-card">
      <div className="bump-badge">
        <Sparkles size={16} />
        <span>Oferta especial</span>
        {total > 1 && (
          <em className="bump-count">
            {current + 1}/{total}
          </em>
        )}
      </div>

      <div className="bump-carousel-wrap">
        <div className="bump-carousel-track" ref={trackRef}>
          {offers.map((o, i) => (
            <div
              key={o.name}
              className={`bump-slide ${i === current ? 'is-active' : ''}`}
              aria-hidden={i !== current}
            >
              {o.imageUrl && <img className="bump-image" src={o.imageUrl} alt={o.name} />}
              <h3>{o.name}</h3>
              {o.description && <p className="bump-desc">{o.description}</p>}
              {o.type === 'micro_service' && (
                <p className="bump-desc">Adiciona {o.additionalMinutes} min ao seu horário.</p>
              )}
              <div className="bump-price">
                {o.originalPrice !== undefined && o.originalPrice > o.price && (
                  <>
                    <s>{formatCurrency(o.originalPrice)}</s>
                    <strong>por {formatCurrency(o.price)}</strong>
                  </>
                )}
                {!(o.originalPrice !== undefined && o.originalPrice > o.price) && (
                  <strong>{formatCurrency(o.price)}</strong>
                )}
              </div>
            </div>
          ))}
        </div>

        {total > 1 && (
          <div className="bump-carousel-nav">
            <button
              type="button"
              className="bump-carousel-arrow"
              onClick={() => go(-1)}
              disabled={current === 0}
              aria-label="Oferta anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="bump-carousel-arrow"
              onClick={() => go(1)}
              disabled={current === total - 1}
              aria-label="Próxima oferta"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="bump-actions bump-actions-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAccept(offer)}
        >
          Aproveitar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDecline}>
          Continuar sem oferta
        </button>
      </div>
    </div>
  );
}
