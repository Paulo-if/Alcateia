import { useEffect, useState } from 'react';

/** Reage a uma media query (ex.: "(max-width: 767px)") e mantém o estado em sincronia. */
export function useMediaQuery(query: string, initialState?: boolean): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (initialState !== undefined) return initialState;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Conveniência mobile-first: true abaixo de 768px. */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}