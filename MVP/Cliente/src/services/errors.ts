// Helpers de mensagens de erro amigáveis (nunca UI com stack trace).

export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // Começa com mensagem clara do sistema (ex.: "Não foi possível...")
    const msg = error.message.trim();
    if (msg) return msg;
  }
  return fallback;
}

/** Lê o código SQL/erro quando disponível (ex.: PostgrestError). */
function errorCode(error: unknown): string | null {
  const code = (error as { code?: unknown })?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * Detecção robusta de erro de concorrência / double booking.
 * A proteção DEFINITIVA contra dupla reserva é a constraint de exclusão GiST
 * `no_overlap_agendamentos` (PostgreSQL), que falha com o código 23P01.
 * Também captura:
 *   - 57014 / PGRST115: query cancelada por lock time-out do double booking.
 *   - mensagens em pt-BR/en com "exclusão/conflict/sobreposição/já reservado".
 * Checar o `code` é mais confiável do que casar texto na mensagem.
 */
export function isConflictError(error: unknown): boolean {
  const code = errorCode(error);
  if (code) {
    if (code === '23P01' || code === '57014' || code === 'PGRST115') return true;
  }
  if (error instanceof Error) {
    return (
      /exclus[ãa]o|exclusion|conflict|sobreposi|available|j[áa] reservado|hor[áa]rio acabou|23P01|57014/i.test(
        error.message,
      )
    );
  }
  return false;
}
