import { useEffect, useMemo, useState } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { formatDateInput, getMonthMatrix, moveMonth, today } from '../../lib/date';
import { type Professional, type Service } from '../../types';
import { dateHasAvailability } from '../../services/availabilityService';
import type { UnavailableRange } from '../../services/availabilityService';
import {
  addDays,
  findNextAvailableDate,
  formatDateBR,
  rangeCovering,
  rangeMessage,
} from '../../lib/unavailableNotice';

interface Props {
  open: boolean;
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  availabilityParams: {
    service: Service | null;
    professionalId: string | 'any' | null;
    professionals: Professional[];
    extraMinutes?: number;
  };
  ranges: UnavailableRange[];
}

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

function parseDateString(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function CalendarModal({ open, selectedDate, onSelect, onClose, availabilityParams, ranges }: Props) {
  // `today()` cria um novo Date a cada chamada. Memoizamos para que `minDate`
  // tenha referência ESTÁVEL e não dispare o effect a cada render (evita loop).
  const minDate = useMemo(() => today(), []);
  const initial = selectedDate ? parseDateString(selectedDate) : minDate;
  const [viewDate, setViewDate] = useState(initial);
  const [picked, setPicked] = useState<string>(selectedDate);
  // Datas do mês visível que NÃO possuem disponibilidade.
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());

  // Popup informativo ao clicar em data bloqueada (não avança o fluxo).
  const [blockedDate, setBlockedDate] = useState<string | null>(null);
  const [nextAvailable, setNextAvailable] = useState<string | null | 'loading'>(null);

  useEffect(() => {
    if (open) {
      setViewDate(selectedDate ? parseDateString(selectedDate) : today());
      setPicked(selectedDate);
      setBlockedDate(null);
      setNextAvailable(null);
    }
  }, [open, selectedDate]);

  // Calcula a disponibilidade das datas do mês visível (a partir de hoje).
  useEffect(() => {
    const { service, professionalId, professionals, extraMinutes } = availabilityParams;
    if (!open || !service || !professionalId) return;

    setUnavailable(new Set());

    let active = true;
    const params = { service, professionalId, professionals, extraMinutes: extraMinutes ?? 0 };
    const weeks = getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth());
    const dates = weeks
      .flat()
      .filter((d): d is Date => !!d && d.getTime() >= minDate.getTime())
      .map((d) => formatDateInput(d));

    (async () => {
      const blocked = new Set<string>();
      for (const ds of dates) {
        if (!active) return;
        let has = false;
        try {
          has = await dateHasAvailability(ds, params);
        } catch {
          has = false;
        }
        if (!has) blocked.add(ds);
      }
      if (active) setUnavailable(blocked);
    })();

    return () => {
      active = false;
    };
  }, [open, viewDate, availabilityParams, minDate]);

  if (!open) return null;

  const canGoPrev = viewDate.getFullYear() > minDate.getFullYear() ||
    (viewDate.getFullYear() === minDate.getFullYear() && viewDate.getMonth() > minDate.getMonth());
  const canGoNext =
    viewDate.getFullYear() < minDate.getFullYear() + 2 ||
    (viewDate.getFullYear() === minDate.getFullYear() + 2 && viewDate.getMonth() < minDate.getMonth());

  const weeks = getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth());

  const selectDate = (date: Date) => {
    const key = formatDateInput(date);
    setPicked(key);
    onSelect(key);
    onClose();
  };

  // Clique em data bloqueada: abre popup explicativo e calcula a próxima data
  // disponível pela camada de disponibilidade (NÃO assume end_date + 1).
  const openBlocked = (key: string) => {
    const range = rangeCovering(ranges, key);
    setBlockedDate(key);
    setNextAvailable('loading');

    const { service, professionalId, professionals, extraMinutes } = availabilityParams;
    if (!service || !professionalId) {
      setNextAvailable(null);
      return;
    }
    const params = {
      service,
      professionalId,
      professionals,
      extraMinutes: extraMinutes ?? 0,
    };
    const fromDate = range ? addDays(range.end, 1) : addDays(key, 1);
    findNextAvailableDate(fromDate, params)
      .then((next) => setNextAvailable(next))
      .catch(() => setNextAvailable(null));
  };

  const blockedRange = blockedDate ? rangeCovering(ranges, blockedDate) : null;
  const blockedTitle = blockedRange ? 'Esse barbeiro não estará atendendo' : 'Data indisponível';
  const blockedMessage = blockedRange
    ? rangeMessage(blockedRange)
    : 'Esta data não possui horários disponíveis.';

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
            const isUnavailable = unavailable.has(key);
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
                  isUnavailable ? 'is-unavailable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (isPast) return;
                  if (isUnavailable) {
                    openBlocked(key);
                    return;
                  }
                  selectDate(date);
                }}
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

      {/* Popup informativo de data bloqueada */}
      {blockedDate && (
        <div className="calendar-root blocked-popup-root" role="alertdialog" aria-modal="true" aria-label={blockedTitle}>
          <div
            className="calendar-backdrop"
            onClick={() => {
              setBlockedDate(null);
              setNextAvailable(null);
            }}
            aria-hidden="true"
          />
          <div className="blocked-popup-panel" role="document">
            <div className="blocked-popup-icon">
              <CalendarOff size={22} />
            </div>
            <strong className="blocked-popup-title">{blockedTitle}</strong>
            <p className="blocked-popup-message">{blockedMessage}</p>
            {blockedDate && !blockedRange && (
              <p className="blocked-popup-next">{formatDateBR(blockedDate)} sem horários disponíveis.</p>
            )}
            <p className="blocked-popup-next" role="status">
              {nextAvailable === 'loading' ? (
                <span className="blocked-popup-loading">
                  <Loader2 size={14} className="spin" />
                  Calculando próxima data disponível...
                </span>
              ) : nextAvailable ? (
                `A próxima data disponível é ${formatDateBR(nextAvailable)}.`
              ) : (
                'Não encontramos uma próxima data disponível no momento.'
              )}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block blocked-popup-action"
              onClick={() => {
                setBlockedDate(null);
                setNextAvailable(null);
              }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
