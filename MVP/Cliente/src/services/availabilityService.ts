import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Professional, Service } from '../types';
import {
  businessHours,
} from '../config';
import {
  combineDateAndTime,
  generateBusinessSlots,
  overlaps,
  timeToMinutes,
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

  if (!isSupabaseConfigured()) {
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

  const businessSlots = generateBusinessSlots(
    businessHours.startHour,
    businessHours.endHour,
    businessHours.intervalMinutes,
  );

  // Descarta horários que já passaram (hoje)
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = dateString ===
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const result: AvailableSlot[] = [];

  if (professionalId === 'any') {
    // "Qualquer profissional" — reúne horários de todos os profissionais compatíveis.
    const seen = new Map<string, string>(); // time -> professionalId mais cedo
    for (const prof of professionals) {
      const busy = await fetchBusyRanges(prof.id, dateString);
      for (const slot of businessSlots) {
        if (isToday && timeToMinutes(slot) <= nowMinutes) continue;
        const willFit = canFitSlot(slot, totalMinutes, busy, dateString);
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

  const busy = await fetchBusyRanges(professionalId, dateString);
  for (const slot of businessSlots) {
    if (isToday && timeToMinutes(slot) <= nowMinutes) continue;
    if (canFitSlot(slot, totalMinutes, busy, dateString)) {
      result.push({ time: slot, professionalId });
    }
  }
  return result;
}

function canFitSlot(
  slotTime: string,
  totalMinutes: number,
  busy: BusyRange[],
  dateString: string,
): boolean {
  const candidateStart = combineDateAndTime(dateString, slotTime);
  const candidateEnd = new Date(candidateStart.getTime() + totalMinutes * 60000);
  const startMin = timeToMinutes(slotTime);

  // Deve terminar dentro do horário de funcionamento
  if (startMin + totalMinutes > businessHours.endHour * 60) {
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
