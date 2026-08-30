import type { BookingStep } from './useBookingFlow';

const PHASES: Array<{ key: string; label: string; steps: BookingStep[] }> = [
  { key: 'escolha', label: 'Escolha', steps: ['service', 'professional'] },
  { key: 'horario', label: 'Horário', steps: ['date', 'time'] },
  { key: 'dados', label: 'Dados', steps: ['customer', 'summary'] },
  { key: 'finalizacao', label: 'Finalização', steps: ['bump', 'payment', 'upsell', 'confirmation'] },
];

export function BookingProgress({ current }: { current: BookingStep }) {
  const currentIndex = PHASES.findIndex((phase) => phase.steps.includes(current));

  return (
    <div className="bp" aria-label="Progresso do agendamento">
      {PHASES.map((phase, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div
            key={phase.key}
            className={`bp-seg ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
          >
            <div className="bp-bar" />
            <span className="bp-label">{phase.label}</span>
          </div>
        );
      })}
      <span className="sr-only">{`Etapa ${Math.min(currentIndex + 1, 4)} de 4`}</span>
    </div>
  );
}