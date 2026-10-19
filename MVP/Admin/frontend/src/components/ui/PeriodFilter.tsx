import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { CalendarModal } from '@/components/ui/CalendarModal';
import {
  cn,
  formatDayMonth,
  formatDateInput,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
} from '@/lib/utils';

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: PeriodPreset;
}

interface PeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function PeriodFilter({ value, onChange, className }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState<string>(
    formatDateInput(value.startDate)
  );
  const [customEnd, setCustomEnd] = useState<string>(
    formatDateInput(value.endDate)
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: PeriodPreset) => {
    const now = new Date();

    if (preset === 'today') {
      onChange({
        preset: 'today',
        startDate: getStartOfDay(now),
        endDate: getEndOfDay(now),
      });
      setIsOpen(false);
    } else if (preset === 'week') {
      onChange({
        preset: 'week',
        startDate: getStartOfWeek(now),
        endDate: getEndOfWeek(now),
      });
      setIsOpen(false);
    } else if (preset === 'month') {
      onChange({
        preset: 'month',
        startDate: getStartOfMonth(now),
        endDate: getEndOfMonth(now),
      });
      setIsOpen(false);
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    const start = getStartOfDay(new Date(`${customStart}T00:00:00`));
    const end = getEndOfDay(new Date(`${customEnd}T00:00:00`));
    if (start > end) {
      alert('A data inicial não pode ser posterior à data final.');
      return;
    }
    onChange({ preset: 'custom', startDate: start, endDate: end });
    setIsOpen(false);
  };

  const formatButtonLabel = () => {
    if (value.preset === 'today') {
      return `Hoje (${formatDayMonth(value.startDate)})`;
    }
    if (value.preset === 'week') {
      return `Esta Semana (${formatDayMonth(value.startDate)} — ${formatDayMonth(value.endDate)})`;
    }
    if (value.preset === 'month') {
      return `Este Mês (${formatDayMonth(value.startDate)} — ${formatDayMonth(value.endDate)})`;
    }
    return `${formatDayMonth(value.startDate)} — ${formatDayMonth(value.endDate)}`;
  };

  return (
    <div className={cn('relative inline-block text-left', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
          isOpen
            ? 'bg-white/10 text-white border-highlight/40 shadow-lg shadow-highlight/10'
            : 'bg-[#141414] text-[#F5F1EA] border-white/10 hover:border-white/20 hover:bg-white/5'
        )}
      >
        <CalendarIcon size={16} className="text-highlight" />
        <span className="truncate max-w-[220px] sm:max-w-none">{formatButtonLabel()}</span>
        <ChevronDown
          size={15}
          className={cn('text-cream/50 transition-transform duration-200', isOpen && 'rotate-180 text-highlight')}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] rounded-2xl bg-[#141414] border border-white/15 shadow-2xl p-4 z-50 animate-scale-in backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-cream/40 mb-2.5 px-1">
            Selecione o período
          </p>

          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {(['today', 'week', 'month'] as const).map((p) => {
              const labels = { today: 'Hoje', week: 'Semana', month: 'Mês' };
              const isSelected = value.preset === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={cn(
                    'py-2 px-2.5 rounded-lg text-xs font-medium transition-all text-center border',
                    isSelected
                      ? 'bg-highlight/15 text-highlight border-highlight/40 font-semibold'
                      : 'bg-white/5 text-cream/70 border-transparent hover:bg-white/10 hover:text-[#F5F1EA]'
                  )}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-cream/60">Período personalizado</span>
              {value.preset === 'custom' && (
                <span className="flex items-center text-[10px] text-highlight font-medium gap-1">
                  <Check size={12} /> Ativo
                </span>
              )}
            </div>

            <div className="space-y-2 mb-3">
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="w-full flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-[#F5F1EA] hover:border-highlight/50 transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <CalendarIcon size={14} className="text-highlight shrink-0" />
                  {customStart && customEnd
                    ? `${formatDayMonth(new Date(`${customStart}T00:00:00`))} — ${formatDayMonth(new Date(`${customEnd}T00:00:00`))}`
                    : 'Escolher intervalo'}
                </span>
                <ChevronDown size={14} className="text-cream/40 shrink-0" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-highlight to-[#2bd4ef] text-black hover:opacity-90 transition-opacity shadow-md shadow-highlight/20"
            >
              Aplicar intervalo
            </button>
          </div>
        </div>
      )}

      {/* Calendário customizado (padrão "Mais datas") - intervalo */}
      <CalendarModal
        open={calendarOpen}
        mode="range"
        title="Período personalizado"
        startValue={customStart || null}
        endValue={customEnd || null}
        onApply={(start, end) => {
          setCustomStart(start);
          setCustomEnd(end);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}
