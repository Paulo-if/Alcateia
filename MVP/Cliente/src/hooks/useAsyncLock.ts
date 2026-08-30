import { useCallback, useRef, useState } from 'react';

export interface AsyncState {
  loading: boolean;
  error: string | null;
}

/**
 * Wrapper que impede double-submit: enquanto uma operação crítica está em andamento,
 * novas chamadas são ignoradas. Retorna também um estado de loading/erro para a UI.
 */
export function useAsyncLock<TArgs extends unknown[], TResult>() {
  const [state, setState] = useState<AsyncState>({ loading: false, error: null });
  const inFlight = useRef(false);

  const run = useCallback(async (fn: (...args: TArgs) => Promise<TResult>, ...args: TArgs): Promise<TResult | null> => {
    if (inFlight.current) return null; // bloqueia duplo clique / chamada duplicada
    inFlight.current = true;
    setState({ loading: true, error: null });
    try {
      const result = await fn(...args);
      setState({ loading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.';
      setState({ loading: false, error: message });
      throw err;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, run, clearError, isLocked: inFlight };
}
