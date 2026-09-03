import { getSupabase, shouldUseFallback } from '../lib/supabase';
import type { Professional, Service } from '../types';
import {
  businessHours,
} from '../config';
import {
  combineDateAndTime,
  formatDateInput,
  generateBusinessSlots,
  overlaps,
  timeToMinutes,
  today,
} from '../lib/date';
import { DEV_BOOKED_BLOCKS } from '../data/devFallback';
import { friendlyError } from './errors';

export interface AvailabilityWindow {
  start: string; // "HH:mm"
  end: string;
}

export interface BusyRange {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  time: string;
  professionalId: string | null; // null quando "qualquer profissional"
}

const STATUS_QUE_NAO_BLOQUEIAM = ['cancelado', 'nao_compareceu'];

/** Intervalo de indisponibilidade (folga/férias) de um profissional. */
export interface UnavailableRange {
  start: string; // "YYYY-MM-DD"
  end: string;   // "YYYY-MM-DD"
  reason: string | null;
}

/**
 * Parâmetros comuns usados para decidir se uma data inteira tem pelo menos um
 * horário disponível (usado na seleção de datas do fluxo público).
 */
export interface DateAvailabilityParams {
  service: Service;
  professionalId: string | 'any';
  professionals: Professional[];
  extraMinutes?: number;
}

/**
 * Retorna os intervalos de indisponibilidade (folga/férias) registrados para
 * um profissional específico. No modo "any" (qualquer profissional) retorna []
 * vazio, pois um bloqueio individual NÃO torna um dia indisponível para a
 * barbearia como um todo: basta haver ao menos um barbeiro disponível.
 */
export async function fetchUnavailableRanges(
  professionalId: string | 'any',
): Promise<UnavailableRange[]> {
  if (shouldUseFallback() || professionalId === 'any') return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('professional_time_off')
    .select('start_date, end_date, reason')
    .eq('professional_id', professionalId)
    .gte('end_date', formatDateInput(today()));

  if (error) {
    throw new Error(friendlyError(error, 'Não foi possível consultar os bloqueios.'));
  }
  return (data ?? []).map((r) => ({
    start: r.start_date,
    end: r.end_date,
    reason: r.reason ?? null,
  }));
}

/**
 * Verifica se uma data inteira possui pelo menos um horário disponível para o
 * serviço/profissional escolhido. Considera folga/férias (professional_time_off),
 * horário semanal, agendamentos existentes e a duração do serviço — ou seja, usa
 * a mesma fonte de verdade usada para gerar os horários (getAvailableSlots).
 *
 * No modo "any", o dia é considerado disponível se houver ao menos um barbeiro
 * elegível naquela data (bloqueio individual não bloqueia a barbearia inteira).
 */
export async function dateHasAvailability(
  dateString: string,
  params: DateAvailabilityParams,
): Promise<boolean> {
  const slots = await getAvailableSlots({
    dateString,
    service: params.service,
    professionalId: params.professionalId,
    professionals: params.professionals,
    extraMinutes: params.extraMinutes ?? 0,
  });
  return slots.length > 0;
}

/**
 * Janela de expediente resolvida para um profissional numa data local.
 * `null` quando o profissional não atende naquele dia (folga/bloqueio ou dia
 * sem expediente configurado). `useBusinessDefault` indica que o profissional
 * ainda não tem agenda configurada e deve usar o horário padrão da barbearia.
 */
export interface WorkingWindow {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  useBusinessDefault: boolean;
}

/**
 * Converte (day+6)%7+1 -> dia da semana na convenção da app (1=Segunda...7=Domingo),
 * a partir de Date.getDay() (0=Domingo...6=Sábado).
 */
function weekdayIndex(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/**
 * Resolve a janela de atendimento de um profissional numa data local a partir de:
 * - professional_time_off: data de folga/bloqueio específica (sobrepõe tudo);
 * - professional_schedules: expediente semanal (dia da semana);
 * - como fallback, se o profissional ainda NÃO tem agenda configurada, usa o
 *   horário padrão da barbearia (businessHours), preservando o fluxo atual.
 *
 * Nota local: comparações por data usam o dia local (não toISOString), mantendo
 * a estratégia de datas da app.
 */
export async function resolveWorkingWindow(
  professionalId: string,
  dateString: string,
): Promise<WorkingWindow | null> {
  if (shouldUseFallback()) {
    // Modo dev: sem agenda configurada, usa o padrão de funcionamento.
    return {
      start: `${businessHours.startHour.toString().padStart(2, '0')}:00`,
      end: `${businessHours.endHour.toString().padStart(2, '0')}:00`,
      useBusinessDefault: true,
    };
  }

  const supabase = getSupabase();
  const date = combineDateAndTime(dateString, '00:00');

  const [{ data: timeOff }, { data: schedules }] = await Promise.all([
    supabase
      .from('professional_time_off')
      .select('*')
      .eq('professional_id', professionalId)
      .lte('start_date', dateString)
      .gte('end_date', dateString)
      .maybeSingle(),
    supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('active', true),
  ]);

  // Folga/bloqueio específico da data: sem expediente.
  if (timeOff) return null;

  const rows = (schedules ?? []) as Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;

  // Profissional ainda sem agenda configurada -> usa o padrão da barbearia.
  if (rows.length === 0) {
    return {
      start: `${businessHours.startHour.toString().padStart(2, '0')}:00`,
      end: `${businessHours.endHour.toString().padStart(2, '0')}:00`,
      useBusinessDefault: true,
    };
  }

  const todayIndex = weekdayIndex(date);
  const dayRows = rows.filter((r) => r.day_of_week === todayIndex);
  if (dayRows.length === 0) {
    return null; // dia da semana sem expediente configurado
  }

  const starts = dayRows.map((r) => r.start_time.slice(0, 5));
  const ends = dayRows.map((r) => r.end_time.slice(0, 5));
  starts.sort();
  ends.sort((a, b) => timeToMinutes(b) - timeToMinutes(a));

  return { start: starts[0], end: ends[0], useBusinessDefault: false };
}

/**
 * Busca os intervalos ocupados (agendamentos ativos) de um profissional numa data local.
 * Agendamentos cancelados/ausentes não bloqueiam horário.
 */
export async function fetchBusyRanges(
  professionalId: string,
  dateString: string,
): Promise<BusyRange[]> {
  const dayStart = combineDateAndTime(dateString, '00:00');
  const dayEnd = combineDateAndTime(dateString, '23:59', 59);

  if (shouldUseFallback()) {
    // Modo dev: simula bloqueios locais do dia
    const blockedTimes = DEV_BOOKED_BLOCKS[professionalId] ?? DEV_BOOKED_BLOCKS.any ?? [];
    return blockedTimes
      .filter((t) => t)
      .map((t) => ({
        start: combineDateAndTime(dateString, t),
        end: new Date(combineDateAndTime(dateString, t).getTime() + 40 * 60000),
      }));
  }

  const supabase = getSupabase();

  let query = supabase
    .from('agendamentos')
    .select('data_inicio, data_fim')
    .gte('data_inicio', dayStart.toISOString())
    .lte('data_inicio', dayEnd.toISOString())
    .not('status', 'in', `(${STATUS_QUE_NAO_BLOQUEIAM.join(',')})`);

  if (professionalId !== 'any') {
    query = query.eq('professional_id', professionalId);
  }

  const { data, error } = await query;
  if (error) throw new Error(friendlyError(error, 'Não foi possível consultar os horários.'));

  return (data ?? []).map((b) => ({
    start: new Date(b.data_inicio),
    end: new Date(b.data_fim),
  }));
}

/**
 * Calcula horários disponíveis para um serviço numa data, considerando:
 * - horário de funcionamento;
 * - duração do serviço (e do bump, quando aplicável);
 * - agendamentos existentes (sobreposição de intervalos);
 * - profissional específico ou "qualquer profissional".
 *
 * Quando professionalId === 'any', retorna para TODOS profissionais e preenche
 * professionalId com o profissional responsável por cada horário disponível.
 */
export async function getAvailableSlots(params: {
  dateString: string;
  service: Service;
  professionalId: string | 'any';
  professionals: Professional[];
  extraMinutes?: number;
}): Promise<AvailableSlot[]> {
  const { dateString, service, professionalId, professionals } = params;
  const totalMinutes = service.duracao_minutos + (params.extraMinutes ?? 0);

  // Descarta horários que já passaram (hoje)
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = dateString ===
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const result: AvailableSlot[] = [];

  if (professionalId === 'any') {
    // "Qualquer profissional" — reúne horários de todos os profissionais compatíveis,
    // considerando o expediente individual de cada um.
    const seen = new Map<string, string>(); // time -> professionalId mais cedo
    for (const prof of professionals) {
      const window = await resolveWorkingWindow(prof.id, dateString);
      if (!window) continue; // profissional sem expediente/folga nesse dia
      const windowSlots = generateBusinessSlots(
        timeToMinutes(window.start) / 60,
        Math.ceil(timeToMinutes(window.end) / 60) || businessHours.endHour,
        businessHours.intervalMinutes,
      );
      const busy = await fetchBusyRanges(prof.id, dateString);
      for (const slot of windowSlots) {
        if (isToday && timeToMinutes(slot) <= nowMinutes) continue;
        const willFit = canFitSlot(slot, totalMinutes, busy, window);
        if (willFit && !seen.has(slot)) {
          seen.set(slot, prof.id);
        }
      }
    }
    for (const [time, profId] of seen) {
      result.push({ time, professionalId: profId });
    }
    result.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return result;
  }

  const window = await resolveWorkingWindow(professionalId, dateString);
  if (!window) return result; // profissional sem expediente/folga nesse dia
  const windowSlots = generateBusinessSlots(
    timeToMinutes(window.start) / 60,
    Math.ceil(timeToMinutes(window.end) / 60) || businessHours.endHour,
    businessHours.intervalMinutes,
  );
  const busy = await fetchBusyRanges(professionalId, dateString);
  for (const slot of windowSlots) {
    if (isToday && timeToMinutes(slot) <= nowMinutes) continue;
    if (canFitSlot(slot, totalMinutes, busy, window)) {
      result.push({ time: slot, professionalId });
    }
  }
  return result;
}

function canFitSlot(
  slotTime: string,
  totalMinutes: number,
  busy: BusyRange[],
  window?: WorkingWindow | null,
): boolean {
  const startMin = timeToMinutes(slotTime);

  // Deve terminar dentro da janela de expediente do profissional (ou do padrão).
  const windowEndMinutes = window && !window.useBusinessDefault
    ? timeToMinutes(window.end)
    : businessHours.endHour * 60;

  if (startMin + totalMinutes > windowEndMinutes) {
    return false;
  }

  const candidateStartMin = timeToMinutes(slotTime);
  const candidateEndMin = candidateStartMin + totalMinutes;

  return !busy.some((range) => {
    const busyStartMin = range.start.getHours() * 60 + range.start.getMinutes();
    const busyEndMin = range.end.getHours() * 60 + range.end.getMinutes();
    return overlaps(candidateStartMin, candidateEndMin, busyStartMin, busyEndMin);
  });
}

export { businessHours };
