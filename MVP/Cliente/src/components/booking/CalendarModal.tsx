import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  formatDateInput,
  formatDayMonth,
  getMonthMatrix,
  isSameDay,
  moveMonth,
  shortWeekdayLabel,
  today,
} from '../../lib/date';

interface Props {
  open: boolean;
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function parseDateString(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function CalendarModal({ open, selectedDate, onSelect, onClose }: Props) {
  const minDate = today();
  const initial = selectedDate ? parseDateString(selectedDate) : minDate;
  const [viewDate, setViewDate] = useState(initial);
  const [picked, setPicked] = useState<string>(selectedDate);

  useEffect(() => {
    if (open) {
      setViewDate(selectedDate ? parseDateString(selectedDate) : today());
      setPicked(selectedDate);
    }
  }, [open, selectedDate]);

  if (!open) return null;

  const canGoPrev = viewDate.getFullYear() > minDate.getFullYear() ||
    (viewDate.getFullYear() === minDate.getFullYear() && viewDate.getMonth() > minDate.getMonth());
  const canGoNext =
    viewDate.getFullYear() < minDate.getFullYear() + 2 ||
    (viewDate.getFullYear() === minDate.getFullYear() + 2 && viewDate.getMonth() < minDate.getMonth());

  const weeks = getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth());

  const selectDate = (date: Date) => {
    setPicked(formatDateInput(date));
    onSelect(formatDateInput(date));
    onClose();
  };

  return (
    <div className="calendar-root" role="dialog" aria-modal="true" aria-label="Escolher outra data">
      <div className="calendar-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="calendar-panel" role="document">
        <div className="calendar-head">
          <button
            type="button"
            className="calendar-nav"
            onClick={() => setViewDate(moveMonth(viewDate, -1))}
            disabled={!canGoPrev}
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <strong className="calendar-title">
            {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(viewDate)}
          </strong>
          <button
            type="button"
            className="calendar-nav"
            onClick={() => setViewDate(moveMonth(viewDate, 1))}
            disabled={!canGoNext}
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {weeks.flat().map((date, i) => {
            if (!date) return <span key={`empty-${i}`} className="calendar-cell empty" />;

            const key = formatDateInput(date);
            const isPast = date.getTime() < minDate.getTime();
            const isPicked = picked === key;
            const isSelected = selectedDate === key;

            return (
              <button
                key={key}
                type="button"
                className={[
                  'calendar-cell',
                  isPicked ? 'is-picked' : '',
                  isSelected ? 'is-selected' : '',
                  isPast ? 'is-past' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => selectDate(date)}
                disabled={isPast}
                aria-pressed={isSelected}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <button type="button" className="calendar-close" onClick={onClose}>
          <X size={16} />
          Fechar
        </button>
      </div>
    </div>
  );
}
