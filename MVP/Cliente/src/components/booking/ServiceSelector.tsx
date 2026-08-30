import { Clock } from 'lucide-react';
import type { Service } from '../../types';
import { formatCurrency } from '../../lib/date';

interface Props {
  services: Service[];
  selectedServiceId: string | null;
  onSelect: (service: Service) => void;
  loading?: boolean;
}

export function ServiceSelector({ services, selectedServiceId, onSelect, loading }: Props) {
  if (loading) {
    return <div className="loading-block">Carregando serviços...</div>;
  }

  if (services.length === 0) {
    return <p className="empty-state">Nenhum serviço disponível no momento.</p>;
  }

  return (
    <div className="pick-list">
      {services.map((service) => {
        const active = selectedServiceId === service.id;
        return (
          <button
            key={service.id}
            type="button"
            className={`pick-card ${active ? 'is-selected' : ''}`}
            onClick={() => onSelect(service)}
            aria-pressed={active}
          >
            <div className="pick-topline">
              <div className="pick-title">
                <h3>{service.nome}</h3>
                <p>{service.descricao || 'Atendimento premium com acabamento impecável.'}</p>
              </div>
              <strong className="pick-price">{formatCurrency(service.preco)}</strong>
            </div>
            <div className="pick-meta">
              <Clock size={14} />
              {service.duracao_minutos} min
            </div>
          </button>
        );
      })}
    </div>
  );
}