// Fuso horário centralizado da barbearia.
// ========================================
// Todo o agendamento armazena timestamp no Supabase como `timestamptz` (UTC).
// O front end interpreta data/horário no fuso LOCAL do navegador, e TODA a
// conversão de/para UTC passa por aqui — para que a regra esteja num único lugar
// e seja configuravel sem caçar `toISOString()` espalhado pelo código.

/** Fuso IANA da barbearia (todos os horários comerciais/exibição). */
export const BARBERSHOP_TZ = 'America/Sao_Paulo';

/** Deslocamento fixo em minutos em relação a UTC (America/Sao_Paulo = UTC-3). */
export const BARBERSHOP_TZ_OFFSET_MINUTES = -180;

/** Rótulo curto para exibição (ex.: "GMT-3"). */
export const BARBERSHOP_TZ_LABEL = 'GMT-3';

/**
 * Converte data ("YYYY-MM-DD") + hora ("HH:mm"), que representam horário LOCAL,
 * em uma string ISO **já em UTC** (timestamptz) para persistir no Supabase.
 * Equivale a combinar como Date local e chamar `.toISOString()`.
 */
export function localDateAndTimeToISO(dateString: string, time: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0).toISOString();
}

/**
 * Interpreta uma string ISO (UTC) retornada pelo Supabase como Date local,
 * preservando o horário real da barbearia para exibição.
 */
export function isoToLocalDate(iso: string | Date): Date {
  return new Date(iso);
}
