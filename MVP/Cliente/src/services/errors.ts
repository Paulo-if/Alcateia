// Helpers de mensagens de erro amigáveis (nunca UI com stack trace).

export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // Começa com mensagem clara do sistema (ex.: "Não foi possível...")
    const msg = error.message.trim();
    if (msg) return msg;
  }
  return fallback;
}

/** Detecção simples de erro de concorrência / double booking (restrição de exclusão). */
export function isConflictError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      /exclusão|exclusion|conflict|sobreposi|Available|23P01|57014/i.test(error.message)
    );
  }
  return false;
}
