import { Database, AlertTriangle } from 'lucide-react';
import {
  useDbStorage,
  formatBytes,
  DB_WARN_RATIO,
  DB_CRITICAL_RATIO,
  DB_LIMIT_BYTES,
} from '@/hooks/useDbStorage';
import { cn } from '@/lib/utils';

/**
 * Aviso visual de que o banco está ficando cheio.
 * Renderizado apenas para o papel MASTER (a verificação de papel é feita no
 * AdminLayout). Sem a função RPC aplicada no remoto, `useDbStorage` devolve
 * null e o banner não aparece (evita inventar métrica).
 */
export function DatabaseUsageBanner() {
  const usage = useDbStorage(DB_LIMIT_BYTES);

  if (!usage) return null;
  if (usage.ratio < DB_WARN_RATIO) return null;

  const critical = usage.ratio >= DB_CRITICAL_RATIO;

  return (
    <div
      className={cn(
        'mb-4 flex items-start gap-3 rounded-xl border px-4 py-3',
        critical
          ? 'bg-red-950/30 border-red-500/40'
          : 'bg-amber-950/30 border-amber-500/40',
      )}
    >
      {critical ? (
        <Database size={18} className="text-red-400 shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
      )}
      <div>
        <p
          className={cn(
            'text-xs font-semibold',
            critical ? 'text-red-300' : 'text-amber-300',
          )}
        >
          Banco de dados quase cheio ({Math.round(usage.ratio * 100)}%
          em uso)
        </p>
        <p className="text-[11px] text-cream/60 mt-0.5">
          Uso atual de {formatBytes(usage.sizeBytes)} de{' '}
          {formatBytes(usage.limitBytes)}. Considere arquivar agendamentos/
          registros antigos ou aumentar o plano para evitar interrupções.
        </p>
      </div>
    </div>
  );
}
