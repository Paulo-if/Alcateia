import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Wallet,
  Users,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  UserCircle2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Papel } from '@/types';

const PAPEL_LABEL: Record<Papel, string> = {
  master: 'Master',
  barbeiro: 'Barbeiro',
};

interface MenuItem {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** apenas master (null/[] = todas as roles) */
  roles?: Papel[];
}

const menuItems: MenuItem[] = [
  { path: '/admin', label: 'Painel', icon: LayoutDashboard },
  { path: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { path: '/admin/clientes', label: 'Clientes', icon: Users },
  { path: '/admin/servicos', label: 'Serviços & Produtos', icon: Scissors, roles: ['master'] },
  { path: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { path: '/admin/usuarios', label: 'Usuários', icon: ShieldCheck, roles: ['master'] },
  { path: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['master'] },
  { path: '/admin/minha-agenda', label: 'Minha Agenda', icon: CalendarDays, roles: ['barbeiro'] },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { papel, usuario } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userName = usuario?.nome;
  const userSubtitle = usuario?.papel
    ? PAPEL_LABEL[usuario.papel]
    : null;

  const visibleMenu = menuItems.filter(
    (item) => !item.roles || (papel && item.roles.includes(papel)),
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] flex">
      {/* Sidebar Desktop e Mobile */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#121212] border-r border-white/10 z-50 flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand / Logo */}
        <div className="p-6 border-b border-white/5">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-highlight to-[#2bd4ef] flex items-center justify-center shadow-lg shadow-highlight/20 group-hover:scale-105 transition-transform">
              <Scissors size={20} className="text-black" />
            </div>
            <div>
              <span className="font-display text-2xl text-[#F5F5F5] tracking-wider block leading-none">
                Alcateia<span className="text-highlight">Barber</span>
              </span>
              <p className="text-[10px] text-cream/40 tracking-widest uppercase mt-1">
                Painel do Barbeiro
              </p>
            </div>
          </Link>
        </div>

        {/* Usuário logado (nome + função) */}
        {userName && (
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="w-9 h-9 rounded-full bg-highlight/20 flex items-center justify-center shrink-0">
                <UserCircle2 size={20} className="text-highlight" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F5F5] truncate">{userName}</p>
                {userSubtitle && (
                  <p className="text-[11px] text-highlight font-medium uppercase tracking-wider">
                    {userSubtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Links de Navegação */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {visibleMenu.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path === '/admin' && location.pathname === '/admin');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-highlight/15 text-highlight font-semibold shadow-sm border border-highlight/30'
                    : 'text-cream/60 hover:text-white hover:bg-white/5 border border-transparent'
                )}
              >
                <item.icon
                  size={18}
                  className={cn(active ? 'text-highlight' : 'text-cream/40')}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3.5 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-900/20 border border-transparent transition-all duration-200"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Backdrop Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Mobile */}
        <header className="lg:hidden bg-[#121212] border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-cream p-1 rounded-lg hover:bg-white/5"
            aria-label="Abrir menu lateral"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex flex-col items-center min-w-0">
            <span className="font-display text-xl text-[#F5F5F5] tracking-wider leading-none">
              Alcateia<span className="text-highlight">Barber</span>
            </span>
            {userName && (
              <span className="text-[11px] text-cream/50 truncate max-w-[50vw] mt-0.5">
                {userName}
                {userSubtitle ? ` · ${userSubtitle}` : ''}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-red-400/80 hover:text-red-300 p-1 rounded-lg hover:bg-red-900/20 transition-colors"
            aria-label="Sair da conta"
          >
            <LogOut size={20} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
