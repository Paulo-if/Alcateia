import { useState } from 'react';
import { Calendar, CalendarCheck, Clock } from 'lucide-react';
import { formatDayMonth, formatTodayLong, formatWeekdayShort } from '../../lib/date';
import { CalendarModal } from './CalendarModal';

interface Props {
  dates: string[];
  selectedDate: string;
  todayHasSlots: boolean | null;
  checkingToday: boolean;
  onSelect: (date: string) => void;
}

export function DateSelector({ dates, selectedDate, todayHasSlots, checkingToday, onSelect }: Props) {
  const today = dates[0];
  const [calendarOpen, setCalendarOpen] = useState(false);

  const todayHint = () => {
    if (checkingToday) return 'Verificando horários...';
    if (todayHasSlots === false) return 'Nenhum horário disponível hoje';
    return 'Ver horários de hoje';
  };

  return (
    <div className="date-picker">
      <button
        type="button"
        className={`today-hero ${selectedDate === today ? 'is-selected' : ''} ${
          todayHasSlots === false ? 'unavailable' : ''
        }`}
        onClick={() => onSelect(today)}
        disabled={todayHasSlots === false}
        aria-pressed={selectedDate === today}
      >
        <span className="today-eyebrow">Hoje</span>
        <strong className="today-date">{formatTodayLong(today)}</strong>
        <span className="today-hint">
          {checkingToday ? <Clock size={14} /> : todayHasSlots === false ? null : <CalendarCheck size={14} />}
          {todayHint()}
        </span>
      </button>

      <div className="date-chips">
        {dates.slice(1).map((date) => (
          <button
            key={date}
            type="button"
            className={`date-chip ${selectedDate === date ? 'is-selected' : ''}`}
            onClick={() => onSelect(date)}
            aria-pressed={selectedDate === date}
          >
            <span>{formatWeekdayShort(date)}</span>
            <strong>{formatDayMonth(date)}</strong>
          </button>
        ))}
      </div>

      <div className="more-dates">
        <button
          type="button"
          className="more-dates-btn"
          onClick={() => setCalendarOpen(true)}
        >
          <Calendar size={16} />
          Mais datas
        </button>
      </div>

      <CalendarModal
        open={calendarOpen}
        selectedDate={selectedDate}
        onSelect={onSelect}
        onClose={() => setCalendarOpen(false)}
      />
    </div>
  );
}