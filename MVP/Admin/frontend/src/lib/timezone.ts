// Fuso horário centralizado da barbearia (Admin).
// ===============================================
// Definição única do fuso usado para exibir/interpretar os horários de
// agendamento. O Supabase armazena `timestamptz` (UTC); a exibição acontece no
// fuso local do navegador. Este módulo centraliza a constante para não haver
// valores hardcoded espalhados (ex.: label "GMT-3" na agenda).

/** Fuso IANA da barbearia (horários comerciais/exibição). */
export const BARBERSHOP_TZ = 'America/Sao_Paulo';

/** Deslocamento fixo em minutos em relação a UTC (America/Sao_Paulo = UTC-3). */
export const BARBERSHOP_TZ_OFFSET_MINUTES = -180;

/** Rótulo curto para exibição (ex.: "GMT-3"). */
export const BARBERSHOP_TZ_LABEL = 'GMT-3';

// =============================================================================
// Helpers para o relógio de "agora" e datas SEM depender do fuso local do
// navegador. A barbearia trabalha em America/Sao_Paulo mesmo que o usuário
// esteja em outro fuso.
// =============================================================================

/** Extrai os componentes (hora/minuto) de um instante no fuso da barbearia. */
function spHourMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BARBERSHOP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return { hour, minute };
}

/** Minutos do relógio (0–1439) de um instante no fuso da barbearia. */
export function getBarbershopMinutes(date: Date): number {
  const { hour, minute } = spHourMinute(date);
  return hour * 60 + minute;
}

/** Chave 'YYYY-MM-DD' de um instante no fuso da barbearia. */
export function getBarbershopDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BARBERSHOP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Minutos atuais (agora) no fuso da barbearia. */
export function getBarbershopNowMinutes(): number {
  return getBarbershopMinutes(new Date());
}

/** Chave 'YYYY-MM-DD' de hoje no fuso da barbearia. */
export function getBarbershopTodayKey(): string {
  return getBarbershopDateKey(new Date());
}

