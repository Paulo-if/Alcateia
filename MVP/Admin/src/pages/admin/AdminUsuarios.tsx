import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Scissors,
  Plus,
  Trash2,
  UserCog,
  AlertTriangle,
  Loader2,
  KeyRound,
  Mail,
  User,
  CalendarRange,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Usuario, Papel } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AdminAgendaProfissional } from '@/components/admin/AdminAgendaProfissional';

const papelLabel: Record<Papel, string> = {
  master: 'Master',
  barbeiro: 'Barbeiro',
};

export function AdminUsuarios() {
  const { usuario: currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? null;

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [papel, setPapel] = useState<Papel>('barbeiro');

  const [confirmDelete, setConfirmDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Usuario | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [agendaFor, setAgendaFor] = useState<{ id: string; name: string } | null>(null);

  const fetchUsuarios = useCallback(async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*, profissional:profissionais(id, name)')
      .order('created_at', { ascending: false });
    setUsuarios((data as Usuario[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchUsuarios();
      setLoading(false);
    })();
  }, [fetchUsuarios]);

  const resetForm = () => {
    setNome('');
    setEmail('');
    setPassword('');
    setPapel('barbeiro');
    setCreateError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!nome.trim() || !email.trim() || !password) {
      setCreateError('Preencha nome, e-mail e senha.');
      return;
    }

    setCreating(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setCreateError('Sessão inválida. Refaça o login.');
      setCreating(false);
      return;
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          password,
          papel,
        }),
      },
    );
    setCreating(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCreateError(body.error ?? 'Não foi possível criar o usuário.');
      return;
    }

    setCreateOpen(false);
    resetForm();
    await fetchUsuarios();
  };

  // Atualiza o `active` do profissional vinculado para refletir o estado do
  // barbeiro (ativo/inativo), mantendo o histórico preservado.
  const syncProfissionalAtivo = async (u: Usuario, active: boolean) => {
    if (u.papel === 'barbeiro' && u.profissional_id) {
      await supabase
        .from('profissionais')
        .update({ active })
        .eq('id', u.profissional_id);
    }
  };

  const handleToggleAtivo = async (u: Usuario) => {
    // Reativação é segura e imediata. Desativação exige confirmação no modal.
    if (u.ativo) {
      setConfirmDeactivate(u);
      return;
    }
    await performToggleAtivo(u, true);
  };

  const performToggleAtivo = async (u: Usuario, novoAtivo: boolean) => {
    setActionError(null);
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: novoAtivo })
      .eq('id', u.id);
    if (error) {
      setActionError('Não foi possível atualizar o usuário.');
      return;
    }
    await syncProfissionalAtivo({ ...u, ativo: novoAtivo }, novoAtivo);
    await fetchUsuarios();
  };

  const confirmDeactivateUser = async () => {
    if (!confirmDeactivate) return;
    setDeactivating(true);
    setActionError(null);
    await performToggleAtivo(confirmDeactivate, false);
    setDeactivating(false);
    setConfirmDeactivate(null);
  };

  const handlePromote = async (u: Usuario) => {
    setActionError(null);
    const { error } = await supabase
      .from('usuarios')
      .update({ papel: 'master' })
      .eq('id', u.id);
    if (error) {
      setActionError('Não foi possível alterar o papel.');
      return;
    }
    await syncProfissionalAtivo({ ...u, papel: 'master' }, false);
    await fetchUsuarios();
  };

  const handleDemote = async (u: Usuario) => {
    setActionError(null);
    // Se o usuário não possui profissional (nunca foi barbeiro anteriormente),
    // cria um automaticamente antes de reativar. Se já possui (reutiliza).
    let profissionalId = u.profissional_id;
    if (!profissionalId) {
      const { data: novo, error: insErr } = await supabase
        .from('profissionais')
        .insert({ name: u.nome, active: true })
        .select('id')
        .single();
      if (insErr || !novo) {
        setActionError('Não foi possível criar o profissional do barbeiro.');
        return;
      }
      profissionalId = (novo as { id: string }).id;
    }
    const { error } = await supabase
      .from('usuarios')
      .update({ papel: 'barbeiro', profissional_id: profissionalId })
      .eq('id', u.id);
    if (error) {
      setActionError('Não foi possível alterar o papel.');
      return;
    }
    await syncProfissionalAtivo({ ...u, papel: 'barbeiro', profissional_id: profissionalId }, true);
    await fetchUsuarios();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    // Proteção contra autoexclusão da própria conta Master.
    if (confirmDelete.id === currentUserId) {
      setActionError('Você não pode remover a própria conta. Peça a outro Master para gerenciá-la.');
      setConfirmDelete(null);
      return;
    }

    setDeleting(true);
    setActionError(null);

    // Remove a sub-conta do Auth via Edge Function não existe; removemos o
    // perfil e desativamos o acesso por RLS (auth_user_id fica órfão na role).
    // Para desativar por completo o login, rebaixamos a sub-conta (ver nota).
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: false, auth_user_id: null })
      .eq('id', confirmDelete.id);
    setDeleting(false);

    if (error) {
      setActionError('Não foi possível remover o usuário.');
      setConfirmDelete(null);
      return;
    }

    // Não apaga o profissional (preserva histórico/atribuições). Apenas o
    // desativa, para não aparecer em novos agendamentos.
    await syncProfissionalAtivo(confirmDelete, false);

    setConfirmDelete(null);
    await fetchUsuarios();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Usuários
          </h1>
          <p className="text-cream/50 text-sm">
            Gerencie os acessos da equipe ao painel (master e barbeiros).
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
        >
          <Plus size={18} />
          Novo Usuário
        </Button>
      </div>

      {actionError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse">
          Carregando usuários...
        </div>
      ) : usuarios.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-cream/40 text-sm mb-4">
            Nenhum usuário cadastrado ainda.
          </p>
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
            variant="outline"
          >
            <Plus size={18} />
            Criar primeiro usuário
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => {
            const isMaster = u.papel === 'master';
            return (
              <div
                key={u.id}
                className={cn(
                  'glass rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4',
                  !u.ativo && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                      isMaster
                        ? 'bg-highlight/15 text-highlight border border-highlight/30'
                        : 'bg-[#1a1a1a] text-cream/60 border border-white/10',
                    )}
                  >
                    {isMaster ? <ShieldCheck size={22} /> : <Scissors size={22} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-cream truncate">{u.nome}</h3>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          isMaster
                            ? 'text-highlight border-highlight/30 bg-highlight/10'
                            : 'text-cream/50 border-white/10 bg-white/5',
                        )}
                      >
                        {papelLabel[u.papel]}
                      </span>
                      {!u.ativo && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-800/50 text-red-400 bg-red-900/20">
                          Inativo
                        </span>
                      )}
                      {u.id === currentUserId && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-sky-500/40 text-sky-300 bg-sky-500/10">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-cream/50 truncate flex items-center gap-1.5">
                      <Mail size={13} className="shrink-0" />
                      {u.email}
                    </p>
                    {u.profissional && (
                      <p className="text-xs text-cream/40 truncate flex items-center gap-1.5 mt-0.5">
                        <User size={13} className="shrink-0" />
                        Profissional: {u.profissional.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isMaster && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handlePromote(u)}>
                        <UserCog size={15} />
                        Tornar Master
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleToggleAtivo(u)}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </>
                  )}
                  {!isMaster && u.profissional && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setAgendaFor({ id: u.profissional!.id, name: u.profissional!.name })
                      }
                    >
                      <CalendarRange size={15} />
                      Agenda
                    </Button>
                  )}
                  {isMaster && (
                    <Button size="sm" variant="outline" onClick={() => handleDemote(u)}>
                      <Scissors size={15} />
                      Tornar Barbeiro
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => u.id !== currentUserId && setConfirmDelete(u)}
                    disabled={u.id === currentUserId}
                  >
                    <Trash2 size={15} />
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== MODAL: CRIAR USUÁRIO ===================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo Usuário">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
              Nome
            </span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário"
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
              E-mail (login)
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barbeiro@barbearia.com"
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
              Senha inicial
            </span>
            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cream/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 pl-11 pr-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
              Papel
            </span>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream outline-none transition-colors focus:border-highlight/60"
            >
              <option value="barbeiro">Barbeiro</option>
              <option value="master">Master</option>
            </select>
          </label>

          {papel === 'barbeiro' && (
            <div className="rounded-xl border border-highlight/20 bg-highlight/5 px-4 py-3">
              <p className="text-xs text-cream/70">
                O <b className="text-highlight">profissional</b> deste barbeiro será criado
                automaticamente com o mesmo nome e passará a aparecer no fluxo de agendamento
                do Cliente.
              </p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className={cn('w-full mt-2', creating && 'opacity-70')}
            disabled={creating}
          >
            {creating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Criando...
              </>
            ) : (
              'Criar usuário'
            )}
          </Button>
        </form>
      </Modal>

      {/* ===================== MODAL: CONFIRMAR REMOÇÃO ===================== */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remover usuário"
      >
        <div className="space-y-4">
          <p className="text-sm text-cream/70">
            Você está prestes a remover <b className="text-cream">{confirmDelete?.nome}</b> (
            {confirmDelete?.email}) da administração da barbearia.
          </p>
          <p className="text-xs text-cream/50">
            O acesso ao painel será revogado. Se houver histórico (agendamentos/financeiro),
            os dados serão preservados e apenas o acesso será desativado.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL: CONFIRMAR DESATIVAÇÃO ===================== */}
      <Modal
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title="Desativar usuário"
      >
        <div className="space-y-4">
          <p className="text-sm text-cream/70">
            Você está prestes a desativar <b className="text-cream">{confirmDeactivate?.nome}</b> (
            {confirmDeactivate?.email}). O usuário deixará de acessar o painel.
          </p>
          <p className="text-xs text-cream/50">
            {confirmDeactivate?.papel === 'barbeiro'
              ? 'O profissional vinculado deixará de aparecer no agendamento do Cliente (active=false). O histórico permanece preservado.'
              : 'O histórico permanece preservado. Você poderá reativar o usuário a qualquer momento.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDeactivate(null)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={confirmDeactivateUser} disabled={deactivating}>
              {deactivating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Desativando...
                </>
              ) : (
                'Desativar'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL: AGENDA DO PROFISSIONAL ===================== */}
      <AdminAgendaProfissional
        open={!!agendaFor}
        onClose={() => setAgendaFor(null)}
        profissional={agendaFor}
      />
    </AdminLayout>
  );
}
