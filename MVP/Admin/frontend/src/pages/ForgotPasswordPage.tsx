import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, Mail, ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const RESET_REDIRECT_URL = `${window.location.origin}/admin/reset-password`;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Informe o e-mail cadastrado para recuperar a senha.');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: RESET_REDIRECT_URL,
    });
    setLoading(false);

    if (resetError) {
      setError(
        'Não foi possível enviar o link de recuperação. Verifique o e-mail informado e tente novamente.',
      );
      return;
    }

    setSent(true);
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
            <p className="text-cream/40 text-xs tracking-widest uppercase mt-1">
              Recuperar senha
            </p>
          </div>

          {sent ? (
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2 text-success mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-xl font-semibold mb-2">E-mail enviado!</h2>
              <p className="text-sm text-cream/50 leading-relaxed mb-6">
                Enviamos um link de recuperação para{' '}
                <span className="text-cream font-medium">{email}</span>. Abra o e-mail e siga as
                instruções para criar uma nova senha.
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/admin/login')}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center mb-1">Esqueceu sua senha?</h2>
              <p className="text-sm text-cream/50 text-center mb-8">
                Informe seu e-mail e enviaremos um link para você redefinir a senha.
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

                <Button
                  type="submit"
                  size="lg"
                  className={cn('w-full mt-2', loading && 'opacity-70')}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 text-sm text-cream/50 hover:text-cream transition-colors"
                >
                  <ArrowLeft size={16} />
                  Voltar para o login
                </Link>
              </div>
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