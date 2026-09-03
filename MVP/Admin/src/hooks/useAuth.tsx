import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types';

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  loading: boolean;
  /** true enquanto a sessão carrega + o perfil é buscado pela 1ª vez */
  profileLoading: boolean;
  /** true quando há sessão mas NENHUM perfil (usuário sem perfil/papel) */
  needsProfile: boolean;
  /** true quando a sessão expirou ou foi encerrada (para exibir mensagem no login) */
  sessionExpired: boolean;
  /** o papel (usuario?.papel) — null enquanto não carregado */
  papel: Usuario['papel'] | null;
  isMaster: boolean;
  isBarbeiro: boolean;
  reloadUsuario: () => Promise<void>;
  clearUsuario: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchUsuario = useCallback(async (sess: Session) => {
    setProfileLoading(true);
    const { data } = await supabase
      .from('usuarios')
      .select('*, profissional:profissionais(id, name)')
      .eq('auth_user_id', sess.user.id)
      .maybeSingle();
    setUsuario((data as Usuario) ?? null);
    setProfileLoading(false);
  }, []);

  const reloadUsuario = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await fetchUsuario(data.session);
  }, [fetchUsuario]);

  const clearUsuario = useCallback(() => {
    setUsuario(null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) fetchUsuario(data.session);
      else setProfileLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!active) return;
      setSession(sess);
      if (sess) {
        setSessionExpired(false);
        fetchUsuario(sess);
      } else {
        setUsuario(null);
        setProfileLoading(false);
        if (event === 'SIGNED_OUT') setSessionExpired(true);
      }
    });

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
    };
  }, [fetchUsuario]);

  const needsProfile = !!session && !profileLoading && !usuario;
  const papel = usuario?.papel ?? null;
  const isMaster = papel === 'master';
  const isBarbeiro = papel === 'barbeiro';

  const value: AuthContextValue = {
    session,
    usuario,
    loading,
    profileLoading,
    needsProfile,
    sessionExpired,
    papel,
    isMaster,
    isBarbeiro,
    reloadUsuario,
    clearUsuario,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}

/** Acessa apenas o papel (ou null). Conveniente para menus/roteamento. */
export function useRole() {
  return useAuth().papel;
}
