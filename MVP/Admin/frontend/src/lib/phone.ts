// Utilitários de telefone/celular (padrão brasileiro) — mesma implementação do Cliente.
// Máscara visual para o usuário e normalização para o BD (apenas dígitos).

/**
 * Remove tudo que não for dígito.
 * Retorna string vazia quando input vazio/undefined.
 */
export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/**
 * Normaliza o telefone para o formato de armazenamento: apenas os 11 dígitos
 * (DDD + número). Ex.: "(11) 99999-9999" -> "11999999999".
 * Se tiver mais que 11 dígitos, mantém somente os 11 últimos (DDD + número).
 */
export function normalizePhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length > 11) return digits.slice(-11);
  return digits;
}

/**
 * Aplica a máscara visual brasileira conforme o número de dígitos digitados.
 *  - 10 dígitos (telefone fixo):  (11) 3222-2222
 *  - 11 dígitos (celular):         (11) 99999-9999
 * Parcial: "(11) 9999" enquanto digita.
 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return d.length === 1 ? d : `(${d})`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;

  // 11 dígitos: (11) 99999-9999
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
