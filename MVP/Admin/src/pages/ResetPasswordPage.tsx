import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scissors,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Status = 'checking' | 'ready' | 'invalid' | 'success';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null) => {
      if (!active) return;
      if (session) setStatus('ready');
    };

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      applySession(data.session);
      // Garante que não fique preso no "verificando" sem sessão.
      setTimeout(() => {
        if (active) setStatus((s) => (s === 'checking' ? 'invalid' : s));
      }, 2500);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') applySession(session);
    });

    check();

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem. Confira e tente novamente.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('Não foi possível atualizar a senha. O link pode estar expirado — solicite um novo.');
      return;
    }

    await supabase.auth.signOut();
    setStatus('success');
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Brilho decorativo de fundo */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-highlight/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold/10 blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 sm:p-10 shadow-2xl">
          {/* Marca */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 mb-4">
              <Scissors size={30} className="text-black" />
            </div>
            <h1 className="font-display text-3xl text-cream tracking-wider">
              Alcateia<span className="text-highlight">Barber</span>
            </h1>
            <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">Nova senha</p>
          </div>

          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={28} className="text-highlight animate-spin" />
              <p className="text-sm text-cream/50">Validando seu link de recuperação...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center text-red-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Link inválido ou expirado</h2>
              <p className="text-sm text-cream/50 leading-relaxed mb-6">
                Este link de recuperação não é válido ou já expirou. Solicite um novo link para
                redefinir sua senha.
              </p>
              <Button
                variant="primary"
                className="w-full mb-3"
                onClick={() => navigate('/admin/forgot-password')}
              >
                Solicitar novo link
              </Button>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm text-cream/50 hover:text-cream transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar para o login
              </Link>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-2">
              <div className="flex items-center justify-center text-success mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Senha atualizada!</h2>
              <p className="text-sm text-cream/50 leading-relaxed mb-6">
                Sua senha foi redefinida com sucesso. Agora você pode entrar com a nova senha.
              </p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/admin/login')}>
                Ir para o login
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <>
              <h2 className="text-xl font-semibold text-center mb-1">Defina sua nova senha</h2>
              <p className="text-sm text-cream/50 text-center mb-8">
                Escolha uma senha segura para acessar o painel.
              </p>

              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                    Nova senha
                  </span>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
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

                <label className="block">
                  <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
                    Confirmar nova senha
                  </span>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 pl-11 pr-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60 focus:ring-2 focus:ring-highlight/20"
                    />
                  </div>
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
                      Salvando...
                    </>
                  ) : (
                    'Salvar nova senha'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-cream/25 text-xs mt-6">
          © {new Date().getFullYear()} Alcateia Barber · Acesso restrito à equipe
        </p>
      </div>
    </div>
  );
}