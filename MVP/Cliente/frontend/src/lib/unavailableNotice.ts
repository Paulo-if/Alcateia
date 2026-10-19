import { formatDateInput } from './date';
import {
  type DateAvailabilityParams,
  type UnavailableRange,
  dateHasAvailability,
} from '../services/availabilityService';

// Utilitários de aviso de indisponibilidade (folga/férias) do fluxo público.
// A separação é apenas VISUAL: o "aviso geral" usa uma janela de antecedência,
// mas a data continua realmente bloqueada durante todo o intervalo configurado.
// A disponibilidade real nunca é alterada aqui — sempre consultando availabilityService.

/** Janela de antecedência (em dias) para mostrar o aviso geral. */
const NOTICE_LEAD_DAYS = 3;
/** Horizonte de busca da próxima data disponível. */
const NEXT_AVAILABLE_HORIZON = 60;

function parseDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Soma/subtrai dias a uma data "YYYY-MM-DD" e retorna "YYYY-MM-DD". */
export function addDays(dateString: string, days: number): string {
  const d = parseDate(dateString);
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

/** "YYYY-MM-DD" >= hoje? */
function isOnOrAfter(dateString: string, todayString: string): boolean {
  return dateString >= todayString;
}

/** A data pertence ao intervalo [start, end]? */
function dateInRange(range: UnavailableRange, dateString: string): boolean {
  return range.start <= dateString && dateString <= range.end;
}

/**
 * Retorna UM intervalo relevante para o aviso geral, obedecendo a janela de 3
 * dias de antecedência: o aviso só aparece quando `hoje >= start_date - 3` e o
 * bloqueio ainda não terminou por completo (`end >= hoje`).
 *
 * Se vários períodos existirem, retorna apenas o mais próximo (um aviso por
 * vez), conforme preferência de UX — sem alterar a semântica real.
 */
export function relevantRangeFor(ranges: UnavailableRange[], todayString: string): UnavailableRange | null {
  const candidates = ranges
    // ignorar bloqueios totalmente encerrados
    .filter((r) => isOnOrAfter(r.end, todayString))
    .filter((r) => {
      const windowStart = addDays(r.start, -NOTICE_LEAD_DAYS);
      return isOnOrAfter(todayString, windowStart);
    });

  if (candidates.length === 0) return null;

  // Prefere o período ativo/mais próximo (menor start). Estável por ordenação.
  candidates.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return candidates[0];
}

/**
 * Monta a mensagem amigável de um intervalo. Não revela texto técnico
 * (blocked/unavailable/time_off/start_date/end_date). O motivo "férias" só é
 * usado quando o campo reason realmente o indicar.
 */
export function rangeMessage(range: UnavailableRange): string {
  const single = range.start === range.end;
  const isVacation = range.reason ? /f[ée]rias/i.test(range.reason) : false;
  const rangePt = `${range.start.slice(8, 10)}/${range.start.slice(5, 7)}/${range.start.slice(0, 4)} a ${range.end.slice(8, 10)}/${range.end.slice(5, 7)}/${range.end.slice(0, 4)}`;
  if (isVacation) {
    return single
      ? `Este barbeiro estará de férias em ${range.start.slice(8, 10)}/${range.start.slice(5, 7)}/${range.start.slice(0, 4)}.`
      : `Este barbeiro estará de férias de ${rangePt}.`;
  }
  return single
    ? `Este barbeiro não estará atendendo em ${range.start.slice(8, 10)}/${range.start.slice(5, 7)}/${range.start.slice(0, 4)}.`
    : `Este barbeiro não estará atendendo de ${rangePt}.`;
}

/** Intervalo que cobre determinada data, se houver. */
export function rangeCovering(ranges: UnavailableRange[], dateString: string): UnavailableRange | null {
  return ranges.find((r) => dateInRange(r, dateString)) ?? null;
}

/**
 * Encontra a próxima data REALMENTE disponível a partir de `fromDate` (inclusive),
 * usando a camada de disponibilidade existente (getAvailableSlots via dateHasAvailability).
 * NÃO assume end_date + 1: a próxima data válida pode pular domingos, dias sem
 * expediente, outras folgas ou dias sem horários livres.
 */
export async function findNextAvailableDate(
  fromDate: string,
  params: DateAvailabilityParams,
): Promise<string | null> {
  const start = parseDate(fromDate);
  const todayObj = parseDate(formatDateInput(new Date()));
  const cur = start < todayObj ? todayObj : start;

  for (let i = 0; i < NEXT_AVAILABLE_HORIZON; i++) {
    const key = formatDateInput(cur);
    let has = false;
    try {
      has = await dateHasAvailability(key, params);
    } catch {
      has = false;
    }
    if (has) return key;
    cur.setDate(cur.getDate() + 1);
  }
  return null;
}

/** "DD/MM/AAAA" a partir de "YYYY-MM-DD". */
export function formatDateBR(dateString: string): string {
  return `${dateString.slice(8, 10)}/${dateString.slice(5, 7)}/${dateString.slice(0, 4)}`;
}
