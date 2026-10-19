import { Users } from 'lucide-react';
import type { Professional } from '../../types';

interface Props {
  professionals: Professional[];
  selectedId: string | 'any' | null;
  onSelect: (id: string | 'any') => void;
  loading?: boolean;
}

export function ProfessionalSelector({ professionals, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return <div className="loading-block">Carregando profissionais...</div>;
  }

  if (professionals.length === 0) {
    return <p className="empty-state">Nenhum profissional disponível no momento.</p>;
  }

  return (
    <div className="pick-list">
      {professionals.map((prof) => {
        const active = selectedId === prof.id;
        return (
          <button
            key={prof.id}
            type="button"
            className={`pick-card ${active ? 'is-selected' : ''}`}
            onClick={() => onSelect(prof.id)}
            aria-pressed={active}
          >
            <div className="pick-row">
              <span className="pick-avatar">
                {prof.avatar_url ? (
                  <img src={prof.avatar_url} alt={prof.name} loading="lazy" />
                ) : (
                  <span>{prof.name.charAt(0)}</span>
                )}
              </span>
              <div className="pick-title">
                <h3>{prof.name}</h3>
                {prof.specialty && <p>{prof.specialty}</p>}
              </div>
            </div>
          </button>
        );
      })}

      <button
        type="button"
        className={`pick-card ${selectedId === 'any' ? 'is-selected' : ''}`}
        onClick={() => onSelect('any')}
        aria-pressed={selectedId === 'any'}
      >
        <div className="pick-row">
          <span className="pick-avatar">
            <Users size={24} />
          </span>
          <div className="pick-title">
            <h3>Qualquer profissional</h3>
            <p>O primeiro horário disponível entre a equipe.</p>
          </div>
        </div>
      </button>
    </div>
  );
}