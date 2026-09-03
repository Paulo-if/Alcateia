import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// =============================================================================
// Uso do banco (aviso "banco ficando cheio") — apenas MASTER vê.
// -----------------------------------------------------------------------------
// A métrica vem do RPC `get_database_size()` (função security definer criada na
// migration 20260905000000). Enquanto essa função não existir no Supabase remoto
// o RPC retorna erro e o hook devolve null — sem inventar métrica falsa e sem
// expor a service_role no frontend.
// =============================================================================

/** Limite de referência do plano (ajustar conforme plano do Supabase). */
export const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB (plano Free padrão)

/** Fração de ocupação que passa a exibir o aviso. */
export const DB_WARN_RATIO = 0.8;

/** Fração de ocupação considerada crítica. */
export const DB_CRITICAL_RATIO = 0.95;

export interface DbUsage {
  sizeBytes: number;
  limitBytes: number;
  ratio: number;
}

/**
 * Consulta o tamanho real do banco via RPC. Devolve `null` quando ainda não se
 * consegue obter a métrica (ex.: função ainda não aplicada no remoto).
 */
export function useDbStorage(limitBytes: number = DB_LIMIT_BYTES) {
  const [usage, setUsage] = useState<DbUsage | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase.rpc('get_database_size');
        // Se a função RPC não existir/erro, não fabricamos um valor.
        if (error || typeof data !== 'number') return;
        if (!active) return;
        const ratio = limitBytes > 0 ? data / limitBytes : 0;
        setUsage({ sizeBytes: data, limitBytes, ratio });
      } catch {
        // silencioso: sem métrica, sem aviso.
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [limitBytes]);

  return usage;
}

/** Formata bytes em uma unidade legível (KB/MB/GB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
