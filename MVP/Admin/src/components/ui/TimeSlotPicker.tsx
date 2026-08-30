import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  value: string; // "09:00", "09:30"
  onChange: (time: string) => void;
  disabledTimes?: string[]; // horários já ocupados
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  className?: string;
}

export function TimeSlotPicker({
  value,
  onChange,
  disabledTimes = [],
  startHour = 8,
  endHour = 20,
  intervalMinutes = 30,
  className,
}: TimeSlotPickerProps) {
  // Gerar horários
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      if (h === endHour && m > 0) break;
      const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push(formatted);
    }
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-cream/50 mb-1.5">
        <span className="flex items-center gap-1.5 font-medium">
          <Clock size={13} className="text-highlight" />
          Selecione o horário
        </span>
        {value && (
          <span className="text-highlight font-semibold bg-highlight/10 px-2 py-0.5 rounded-md text-[11px]">
            {value} selecionado
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 pr-1.5 rounded-xl bg-[#0D0D0D] border border-white/10">
        {slots.map((slot) => {
          const isSelected = value === slot;
          const isDisabled = disabledTimes.includes(slot);

          return (
            <button
              key={slot}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(slot)}
              className={cn(
                'py-2 px-1 text-center rounded-lg text-xs font-medium transition-all duration-150 border',
                isSelected
                  ? 'bg-highlight text-black font-bold border-highlight shadow-md shadow-highlight/20 scale-[1.02]'
                  : isDisabled
                  ? 'bg-white/[0.02] text-cream/20 border-white/5 cursor-not-allowed line-through'
                  : 'bg-[#161616] text-[#F5F5F5] border-white/10 hover:border-highlight hover:text-highlight hover:bg-highlight/5'
              )}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
