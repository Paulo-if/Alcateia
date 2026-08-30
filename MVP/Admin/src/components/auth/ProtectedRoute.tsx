import { type ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Scissors, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ProtectedRouteProps {
  children: ReactNode;
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-cream flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 animate-pulse">
        <Scissors size={30} className="text-black" />
      </div>
      <div className="flex items-center gap-2 text-sm text-cream/50">
        <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-bounce [animation-delay:0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  );
}

/**
 * Bootstrap: usuário autenticado mas SEM perfil em `usuarios`.
 * É o único momento em que alguém pode virar master (vincular-admin só
 * funciona quando a tabela `usuarios` não possui nenhum master).
 */
function VincularAdminScreen() {
  const { reloadUsuario } = useAuth();
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVincular = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nome.trim() || !password.trim()) {
      setError('Informe nome e senha para confirmar.');
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError('Sessão inválida. Faça login novamente.');
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vincular-admin`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: nome.trim() }),
      },
    );
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível vincular o administrador.');
      return;
    }

    await reloadUsuario();
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-cream flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-highlight/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold/10 blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 mb-4">
              <Scissors size={30} className="text-black" />
            </div>
            <h1 className="font-display text-3xl text-cream tracking-wider">
              Alcateia<span className="text-highlight">Barber</span>
            </h1>
            <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
              Configuração inicial
            </p>
          </div>

          <div className="mb-6 flex gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>
              Sua conta está criada, mas ainda não vinculada à barbearia. Como
              é a primeira configuração, você será o <b>administrador master</b>.
            </span>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVincular} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                Seu nome
              </span>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: João Silva"
                className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60 focus:ring-2 focus:ring-highlight/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                Confirme sua senha
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60 focus:ring-2 focus:ring-highlight/20"
              />
            </label>

            <Button
              type="submit"
              size="lg"
              className={cn('w-full mt-2', loading && 'opacity-70')}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Vinculando...
                </>
              ) : (
                'Vincular como administrador'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-cream/25 text-xs mt-6">
          Acesso restrito à equipe Alcateia Barber
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, session, needsProfile } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/admin/login', {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [loading, session, navigate, location.pathname]);

  if (loading) return <FullScreenLoader />;
  if (!session) return null;

  // Sessão existe mas ainda não há perfil/papel.
  if (needsProfile) return <VincularAdminScreen />;

  return <>{children}</>;
}
