import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Scissors, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sessionExpired = (location.state as { expired?: boolean } | null)?.expired;

  useEffect(() => {
    if (sessionExpired) {
      setError('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }, [sessionExpired]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) navigate('/admin', { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
      } else if (authError.message.includes('Email not confirmed')) {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError('Não foi possível fazer login. Tente novamente em alguns instantes.');
      }
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Brilho decorativo de fundo */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-highlight/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold/10 blur-3xl" />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 sm:p-10 shadow-2xl">
          {/* Marca */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 mb-4">
              <Scissors size={30} className="text-black" />
            </div>
            <h1 className="font-display text-3xl text-cream tracking-wider">
              Alcateia<span className="text-highlight">Barber</span>
            </h1>
            <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
              Painel do Barbeiro
            </p>
          </div>

          <h2 className="text-xl font-semibold text-center mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-cream/50 text-center mb-8">
            Acesse sua conta para gerenciar a barbearia.
          </p>

          {error && (
            <div
              className={cn(
                'mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
                sessionExpired
                  ? 'border-amber-700/50 bg-amber-900/20 text-amber-300'
                  : 'border-red-800/50 bg-red-900/20 text-red-300',
              )}
            >
              {sessionExpired ? (
                <Clock size={18} className="shrink-0" />
              ) : (
                <AlertCircle size={18} className="shrink-0" />
              )}
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <label className="block">
              <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                E-mail
              </span>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
                />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@barbearia.com"
                  className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 pl-11 pr-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60 focus:ring-2 focus:ring-highlight/20"
                />
              </div>
            </label>

            {/* Senha */}
            <label className="block">
              <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                Senha
              </span>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 pl-11 pr-12 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60 focus:ring-2 focus:ring-highlight/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="text-right -mt-1">
              <Link
                to="/admin/forgot-password"
                className="text-xs text-cream/50 hover:text-highlight transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <Button
              type="submit"
              size="lg"
              className={cn('w-full mt-2', loading && 'opacity-70')}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-cream/25 text-xs mt-6">
          © {new Date().getFullYear()} Alcateia Barber · Acesso restrito à equipe
        </p>
      </div>
    </div>
  );
}
