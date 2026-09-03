import { useMemo, useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Agendamento, Servico, Cliente } from '@/types';
import { formatCurrency, formatTime, formatDateInput, getStartOfWeek, cn } from '@/lib/utils';
import { DayView } from '@/components/agenda/DayView';

export type AgendamentoItem = Agendamento & {
  servico?: Pick<Servico, 'id' | 'nome' | 'duracao_minutos'> | null;
  cliente?: Pick<Cliente, 'id' | 'nome' | 'telefone' | 'email'> | null;
};

interface WeekViewProps {
  currentDate: Date | string;
  agendamentos: AgendamentoItem[];
  onSelectEvent?: (agendamento: AgendamentoItem) => void;
  onSlotClick?: (dateStr: string, timeStr: string) => void;
  startHour?: number;
  endHour?: number;
  className?: string;
}

const HOUR_HEIGHT_PX = 60; // Altura de 1 hora na grade semanal

export function WeekView({
  currentDate,
  agendamentos,
  onSelectEvent,
  onSlotClick,
  startHour = 8,
  endHour = 20,
  className,
}: WeekViewProps) {
  const targetDate = useMemo(
    () => (typeof currentDate === 'string' ? new Date(`${currentDate}T00:00:00`) : currentDate),
    [currentDate]
  );

  // Dia selecionado na visualização mobile (uma dia por vez).
  // Inicia no dia que contém `currentDate` e segue a navegação externa.
  const [mobileDay, setMobileDay] = useState<string>(() => formatDateInput(targetDate));

  useEffect(() => {
    setMobileDay(formatDateInput(targetDate));
  }, [targetDate]);

  // Obter os 7 dias da semana (Segunda a Domingo)
  const weekDays = useMemo(() => {
    const monday = getStartOfWeek(targetDate);
    const days: { date: Date; dateStr: string; label: string; dayNum: number; isToday: boolean }[] = [];
    const now = new Date();
    const dayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      days.push({
        date: d,
        dateStr: formatDateInput(d),
        label: dayLabels[i],
        dayNum: d.getDate(),
        isToday,
      });
    }
    return days;
  }, [targetDate]);

  const totalHours = endHour - startHour;
  const gridHeight = totalHours * HOUR_HEIGHT_PX;

  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  // Posicionar eventos por dia
  const eventsByDay = useMemo(() => {
    const map: Record<string, (AgendamentoItem & { top: number; height: number; startTimeFormatted: string; endTimeFormatted: string })[]> = {};

    weekDays.forEach((day) => {
      map[day.dateStr] = [];
    });

    agendamentos.forEach((ag) => {
      const startDate = new Date(ag.data_inicio);
      const endDate = new Date(ag.data_fim);
      const dayStr = formatDateInput(startDate);

      if (map[dayStr]) {
        const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
        const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

        const gridStartMinutes = startHour * 60;
        const topMinutes = Math.max(0, startMinutes - gridStartMinutes);
        const durationMinutes = Math.max(20, endMinutes - startMinutes || (ag.servico?.duracao_minutos ?? 30));

        const top = (topMinutes / 60) * HOUR_HEIGHT_PX;
        const height = Math.max(34, (durationMinutes / 60) * HOUR_HEIGHT_PX - 3);

        map[dayStr].push({
          ...ag,
          top,
          height,
          startTimeFormatted: formatTime(startDate),
          endTimeFormatted: formatTime(endDate),
        });
      }
    });

    return map;
  }, [agendamentos, weekDays, startHour]);

  // Eventos do dia selecionado na visualização mobile
  const mobileDayEvents = useMemo(
    () => agendamentos.filter((ag) => formatDateInput(new Date(ag.data_inicio)) === mobileDay),
    [agendamentos, mobileDay]
  );

  const handleGridSlotClick = (e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const totalMinutes = (offsetY / HOUR_HEIGHT_PX) * 60;
    const clickedHour = Math.floor(startHour + totalMinutes / 60);
    const clickedMinute = Math.floor((totalMinutes % 60) / 30) * 30;

    const formattedTime = `${clickedHour.toString().padStart(2, '0')}:${clickedMinute.toString().padStart(2, '0')}`;
    onSlotClick(dateStr, formattedTime);
  };

  return (
    <div className={cn('relative w-full rounded-2xl bg-[#0D0D0D] border border-white/10 overflow-hidden flex flex-col', className)}>
      {/* Cabeçalho dos Dias da Semana (desktop) */}
      <div className="hidden sm:flex border-b border-white/10 bg-[#121212] select-none">
        {/* Espaço da coluna de horários */}
        <div className="w-14 sm:w-16 shrink-0 border-r border-white/10 p-3 text-right text-[11px] text-cream/40 font-mono">
          GMT-3
        </div>

        {/* 7 Colunas dos Dias */}
        <div className="flex-1 grid grid-cols-7 divide-x divide-white/5">
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                'py-2.5 px-1 text-center transition-colors',
                day.isToday && 'bg-highlight/5'
              )}
            >
              <span className="text-[10px] sm:text-xs font-semibold text-cream/50 tracking-wider block">
                {day.label}
              </span>
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-bold mt-0.5',
                  day.isToday
                    ? 'bg-highlight text-black shadow-md shadow-highlight/20'
                    : 'text-[#F5F1EA]'
                )}
              >
                {day.dayNum}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grade com Scroll (desktop) */}
      <div className="hidden sm:block relative overflow-y-auto max-h-[580px] select-none p-1 sm:p-2">
        <div className="relative flex" style={{ minHeight: `${gridHeight}px` }}>
          {/* Coluna de Horas */}
          <div className="w-14 sm:w-16 shrink-0 border-r border-white/5 pr-2 flex flex-col select-none">
            {hoursList.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="relative -top-2.5 text-right text-[11px] font-medium text-cream/40"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Área das 7 Colunas da Semana */}
          <div className="flex-1 grid grid-cols-7 divide-x divide-white/5 relative">
            {/* Linhas Horizontais das Horas */}
            {hoursList.map((hour, idx) => (
              <div
                key={hour}
                style={{ top: `${idx * HOUR_HEIGHT_PX}px` }}
                className="absolute left-0 right-0 border-t border-white/[0.05] pointer-events-none"
              >
                <div
                  style={{ top: `${HOUR_HEIGHT_PX / 2}px` }}
                  className="absolute left-0 right-0 border-t border-dashed border-white/[0.02]"
                />
              </div>
            ))}

            {/* Coluna de cada dia */}
            {weekDays.map((day) => {
              const dayEvents = eventsByDay[day.dateStr] || [];

              return (
                <div
                  key={day.dateStr}
                  onClick={(e) => handleGridSlotClick(e, day.dateStr)}
                  className="relative h-full cursor-pointer hover:bg-white/[0.015] transition-colors"
                  style={{ minHeight: `${gridHeight}px` }}
                  title="Clique para agendar neste horário"
                >
                  {/* Eventos da coluna */}
                  {dayEvents.map((event) => {
                    const isConcluido = event.status === 'concluido';
                    const isCancelado = event.status === 'cancelado';
                    const isShortEvent = event.height < 48;

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent?.(event);
                        }}
                        style={{
                          top: `${event.top}px`,
                          height: `${event.height}px`,
                        }}
                        className={cn(
                          'absolute left-0.5 right-0.5 rounded-lg z-10 cursor-pointer overflow-hidden',
                          'flex flex-col justify-start transition-all duration-150 hover:z-30 hover:scale-[1.02] hover:shadow-lg border',
                          'p-1.5 leading-tight',
                          isConcluido
                            ? 'bg-[#81FF4D]/15 border-[#81FF4D]/40 text-cream hover:border-[#81FF4D]'
                            : isCancelado
                            ? 'bg-[#F51D1D]/15 border-[#F51D1D]/30 text-cream opacity-60'
                            : 'bg-gradient-to-r from-[#182830] to-[#121c22] border-highlight/40 text-white hover:border-highlight shadow-sm'
                        )}
                      >
                        {isShortEvent ? (
                          <div className="w-full flex items-center justify-between gap-1 overflow-hidden h-full">
                            <span className="text-[11px] font-semibold text-[#F5F1EA] truncate">
                              {event.cliente?.nome || 'Cliente'}
                              {event.servico?.nome && (
                                <span className="text-cream/60 font-normal"> • {event.servico.nome}</span>
                              )}
                            </span>
                            {isConcluido && <CheckCircle2 size={11} className="text-[#81FF4D] shrink-0" />}
                            {isCancelado && <XCircle size={11} className="text-[#F51D1D] shrink-0" />}
                          </div>
                        ) : (
                          <>
                            {/* Linha 1: Nome do Cliente */}
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                              <p className="text-[11px] sm:text-xs font-bold truncate text-[#F5F1EA] m-0">
                                {event.cliente?.nome || 'Cliente'}
                              </p>
                              {isConcluido && <CheckCircle2 size={11} className="text-[#81FF4D] shrink-0" />}
                              {isCancelado && <XCircle size={11} className="text-[#F51D1D] shrink-0" />}
                            </div>

                            {/* Linha 2: Serviço */}
                            {event.servico?.nome && (
                              <p className="text-[10px] text-cream/70 truncate m-0 font-medium mt-0.5">
                                {event.servico.nome}
                              </p>
                            )}

                            {/* Linha 3: Horário alinhado */}
                            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-cream/60 font-mono mt-auto overflow-hidden">
                              <Clock size={10} className="text-highlight/80 shrink-0" />
                              <span className="truncate">
                                {event.startTimeFormatted} - {event.endTimeFormatted}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visualização mobile: um dia por vez (reutiliza DayView) */}
      <div className="sm:hidden flex flex-col gap-2">
        {/* Seletor de dia da semana */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
          {weekDays.map((day) => {
            const isActive = day.dateStr === mobileDay;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setMobileDay(day.dateStr)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[46px] px-2 py-1.5 rounded-xl border text-center transition-colors',
                  isActive
                    ? 'bg-highlight/15 text-highlight border-highlight/40 font-semibold'
                    : 'bg-white/[0.03] text-cream/70 border-white/10',
                  day.isToday && !isActive && 'border-highlight/30 text-highlight'
                )}
              >
                <span className="text-[10px] font-semibold tracking-wider">{day.label}</span>
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5',
                    isActive ? 'bg-highlight text-black' : day.isToday ? 'text-highlight' : 'text-cream'
                  )}
                >
                  {day.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        <DayView
          date={mobileDay}
          agendamentos={mobileDayEvents}
          onSelectEvent={onSelectEvent}
          onSlotClick={onSlotClick}
          startHour={startHour}
          endHour={endHour}
          className="min-h-[460px]"
        />
      </div>
    </div>
  );
}
