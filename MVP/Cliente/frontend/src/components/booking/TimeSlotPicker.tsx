import type { AvailableSlot } from '../../services/availabilityService';
import type { Professional } from '../../types';

interface Props {
  slots: AvailableSlot[];
  professionals: Professional[];
  value: string;
  anyProfessionalMode: boolean;
  onSelect: (slot: AvailableSlot) => void;
  loading?: boolean;
  error?: string | null;
}

function groupByPeriod(slots: AvailableSlot[]) {
  const groups: Array<{ title: string; slots: AvailableSlot[] }> = [
    { title: 'Manhã', slots: [] },
    { title: 'Tarde', slots: [] },
  ];
  for (const slot of slots) {
    const isMorning = slot.time < '12:00';
    groups[isMorning ? 0 : 1].slots.push(slot);
  }
  return groups.filter((group) => group.slots.length > 0);
}

export function TimeSlotPicker({
  slots,
  professionals,
  value,
  anyProfessionalMode,
  onSelect,
  loading,
  error,
}: Props) {
  if (loading) {
    return <div className="loading-block">Carregando horários...</div>;
  }

  if (error) {
    return <p className="empty-state">{error}</p>;
  }

  if (slots.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum horário disponível para este dia.</p>
        <p className="empty-hint">Tente outra data.</p>
      </div>
    );
  }

  const profById = new Map(professionals.map((p) => [p.id, p]));
  const groups = groupByPeriod(slots);

  return (
    <div className="slot-groups">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="slot-group-title">{group.title}</p>
          <div className="slot-grid">
            {group.slots.map((slot) => {
              const professional = slot.professionalId ? profById.get(slot.professionalId) : undefined;
              const selected =
                value === slot.time && (!anyProfessionalMode || Boolean(slot.professionalId));
              return (
                <button
                  key={`${slot.time}-${slot.professionalId ?? 'any'}`}
                  type="button"
                  className={`slot-button ${selected ? 'is-selected' : ''}`}
                  onClick={() => onSelect(slot)}
                  aria-pressed={selected}
                >
                  <span className="slot-time">{slot.time}</span>
                  {anyProfessionalMode && professional && (
                    <span className="slot-professional">{professional.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="slots-hint">
        {anyProfessionalMode
          ? 'Horários exibidos com o profissional disponível para o atendimento.'
          : 'Horários reais de agenda marcados como indisponíveis não são exibidos.'}
      </p>
    </div>
  );
}