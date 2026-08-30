import { type ReactNode } from 'react';
import {
  AlertCircle,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Papel } from '@/types';
import { Button } from '@/components/ui/Button';

interface RoleRouteProps {
  roles: Papel[];
  children: ReactNode;
  /** rota de destino quando o usuário não possui papel permitido */
  redirectTo?: string;
}

/**
 * Protege uma rota por papel (ex.: apenas master). Deve ser usado
 * DENTRO de um <ProtectedRoute> (que já garante sessão + perfil).
 */
export function RoleRoute({ roles, children, redirectTo = '/admin' }: RoleRouteProps) {
  const { usuario, papel } = useAuth();

  // Ainda carregando o perfil: aguarda (sem tela de login).
  if (!usuario) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-cream flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 animate-pulse">
          <Lock size={26} className="text-black" />
        </div>
      </div>
    );
  }

  if (!papel || !roles.includes(papel)) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-cream flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-800/40 flex items-center justify-center mb-5">
          <AlertCircle size={30} className="text-red-400" />
        </div>
        <h1 className="font-display text-2xl text-cream mb-2">Acesso restrito</h1>
        <p className="text-sm text-cream/50 max-w-sm mb-6">
          Esta área está disponível apenas para o administrador master da
          barbearia.
        </p>
        <Button variant="ghost" onClick={() => (window.location.href = redirectTo)}>
          <ArrowLeft size={16} />
          Voltar ao painel
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
