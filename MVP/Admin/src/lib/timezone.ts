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
