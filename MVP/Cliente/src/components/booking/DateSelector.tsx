import { useState } from 'react';
import { Calendar, CalendarCheck, CalendarOff, Loader2 } from 'lucide-react';
import { formatDayMonth, formatTodayLong, formatWeekdayShort } from '../../lib/date';
import type { UnavailableRange } from '../../services/availabilityService';
import {
  rangeMessage,
  relevantRangeFor,
} from '../../lib/unavailableNotice';
import type { Professional, Service } from '../../types';
import { CalendarModal } from './CalendarModal';

interface Props {
  today: string;
  dates: string[]; // próximas datas disponíveis (8)
  selectedDate: string;
  todayAvailable: boolean | null;
  onSelect: (date: string) => void;
  ranges: UnavailableRange[]; // intervalos de folga/férias (avisos)
  availabilityParams: {
    service: Service | null;
    professionalId: string | 'any' | null;
    professionals: Professional[];
    extraMinutes?: number;
  };
}

export function DateSelector({
  today,
  dates,
  selectedDate,
  todayAvailable,
  onSelect,
  ranges,
  availabilityParams,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const checkingToday = todayAvailable === null;
  const todayIsAvailable = todayAvailable === true;

  // Data principal: quando HOJE ainda é agendável, mantém "Hoje". Caso contrário
  // (expediente de hoje já encerrado ou folga/férias), o destaque passa
  // automaticamente para a próxima data REALMENTE disponível — `dates[0]` já vem
  // da camada de disponibilidade e pula folgas, feriados, domingos e horários
  // encerrados (não é simplesmente today + 1). Se nada estiver calculado ainda
  // (carregamento/edge), mantém HOJE como referência segura.
  const primaryDate = todayIsAvailable ? today : (dates[0] ?? today);
  const isPrimaryToday = primaryDate === today;
  const primaryLabel = isPrimaryToday ? 'HOJE' : 'PRÓXIMA DATA';

  // Aviso geral obedece à janela de 3 dias de antecedência (um por vez).
  const generalRange = relevantRangeFor(ranges, today);

  // As chips mostram as demais datas disponíveis (além do destaque principal).
  const chips = dates.filter((d) => d !== primaryDate);

  const primaryHint = () => {
    if (checkingToday) return 'Verificando horários...';
    if (!isPrimaryToday) return 'Próxima data com horários';
    return 'Ver horários de hoje';
  };

  return (
    <div className="date-picker">
      {/* Destaque: HOJE (agendável) ou PRÓXIMA DATA (quando hoje já não tem horário) */}
      <button
        type="button"
        className={`today-hero ${selectedDate === primaryDate ? 'is-selected' : ''}`}
        onClick={() => onSelect(primaryDate)}
        aria-pressed={selectedDate === primaryDate}
      >
        <span className="today-eyebrow">{primaryLabel}</span>
        <strong className="today-date">{formatTodayLong(primaryDate)}</strong>
        <span className="today-hint">
          {checkingToday ? <Loader2 size={14} className="spin" /> : <CalendarCheck size={14} />}
          {primaryHint()}
        </span>
      </button>

      {/* Aviso geral: período de folga/férias dentro da janela de 3 dias */}
      {generalRange && (
        <div className="unavailable-banner" role="status">
          <CalendarOff size={18} />
          <div className="unavailable-banner-text">
            {rangeMessage(generalRange)}
          </div>
        </div>
      )}

      {/* Próximas datas disponíveis */}
      {chips.length > 0 && (
        <div className="date-chips">
          {chips.map((date) => (
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
      )}

      {checkingToday && dates.length === 0 && (
        <div className="date-loading" role="status">
          <Loader2 size={16} className="spin" />
          Buscando datas disponíveis...
        </div>
      )}

      <div className="more-dates">
        <button type="button" className="more-dates-btn" onClick={() => setCalendarOpen(true)} disabled={checkingToday}>
          <Calendar size={16} />
          Mais datas
        </button>
      </div>

      <CalendarModal
        open={calendarOpen}
        selectedDate={selectedDate}
        onSelect={onSelect}
        onClose={() => setCalendarOpen(false)}
        availabilityParams={availabilityParams}
        ranges={ranges}
      />
    </div>
  );
}
