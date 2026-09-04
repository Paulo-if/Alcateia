import { useEffect, useState, useCallback } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  List,
  Clock,
  Trash2,
  Tag,
  Phone,
  UserCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { VendaBump, Profissional } from '@/types';
import {
  formatCurrency,
  formatDateTime,
  formatDayMonth,
  formatWeekday,
  formatDateInput,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfDay,
  getEndOfDay,
  cn,
} from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { CalendarModal } from '@/components/ui/CalendarModal';
import { DayView, type AgendamentoDayItem } from '@/components/agenda/DayView';
import { WeekView } from '@/components/agenda/WeekView';
import { NovoAgendamentoModal } from '@/components/agendamento/NovoAgendamentoModal';

const statusConfig: Record<string, { label: string; variant: 'gold' | 'success' | 'danger' | 'default' }> = {
  agendado: { label: 'Agendado', variant: 'gold' },
  concluido: { label: 'ConcluÃ­do', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
};

type ViewMode = 'semana' | 'dia' | 'lista';

export function AdminAgendamentos() {
  // VisualizaÃ§Ã£o padrÃ£o obrigatÃ³ria: SEMANA
  const [viewMode, setViewMode] = useState<ViewMode>('semana');
  const [agendamentos, setAgendamentos] = useState<AgendamentoDayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedAg, setSelectedAg] = useState<AgendamentoDayItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bumps, setBumps] = useState<VendaBump[]>([]);
  const pageSize = 12;

  // Data central de navegaÃ§Ã£o da agenda (inicia hoje)
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateInput(new Date())
  );

  // Qual calendÃ¡rio customizado estÃ¡ aberto
  const [calOpen, setCalOpen] = useState<null | 'week' | 'day'>(null);

  // Agendamentos para o perÃ­odo visÃ­vel (semana ou dia)
  const [periodAgendamentos, setPeriodAgendamentos] = useState<AgendamentoDayItem[]>([]);

  // Create form state
  // Dados prÃ©-preenchidos ao abrir o modal de novo agendamento (slot clique / botÃ£o Novo)
  const [createInitial, setCreateInitial] = useState<{
    date: string;
    time: string;
    profissional: string;
  } | null>(null);

  // Filtro por profissional (somente master â€” o barbeiro jÃ¡ vÃª sÃ³ a prÃ³pria agenda via RLS)
  const { isMaster, isBarbeiro, usuario } = useAuth();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalFilter, setProfissionalFilter] = useState('');

  // TASK 13 â€” [INTEGRIDADE] Barbeiro sem agenda nÃ£o pode receber agendamentos:
  // ids dos profissionais com ao menos um expediente ATIVO. `null` = ainda nÃ£o
  // carregou (permite agir normalmente atÃ© concluir a consulta).
  const [schedulableIds, setSchedulableIds] = useState<Set<string> | null>(null);
  const isSchedulable = (id: string) => schedulableIds === null || schedulableIds.has(id);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('professional_schedules')
        .select('professional_id')
        .eq('active', true);
      setSchedulableIds(
        new Set((data ?? []).map((r: { professional_id: string }) => r.professional_id)),
      );
    })();
  }, []);

  useEffect(() => {
    if (!isMaster) return;
    (async () => {
      const { data } = await supabase
        .from('profissionais')
        .select('*')
        .order('name');
      setProfissionais((data as Profissional[]) ?? []);
    })();
  }, [isMaster]);

  // Buscar lista de agendamentos para a visÃ£o Lista
  const fetchListaAgendamentos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('agendamentos')
      .select(
        '*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone, email), profissional:profissionais(id, name, specialty)',
        { count: 'exact' },
      )
      .order('data_inicio', { ascending: false });

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }

    if (isBarbeiro && usuario?.profissional_id) {
      query = query.eq('professional_id', usuario.profissional_id);
    } else if (isMaster && profissionalFilter) {
      query = query.eq('professional_id', profissionalFilter);
    }

    const { data, count: totalCount } = await query.range(
      page * pageSize,
      (page + 1) * pageSize - 1,
    );

    let filtered = (data as AgendamentoDayItem[]) ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.cliente?.nome?.toLowerCase().includes(q) ||
          a.servico?.nome?.toLowerCase().includes(q) ||
          a.cliente?.telefone?.includes(q),
      );
    }

    setAgendamentos(filtered);
    setCount(totalCount ?? 0);
    setLoading(false);
  }, [page, statusFilter, search, isMaster, isBarbeiro, usuario?.profissional_id, profissionalFilter]);

  // Buscar agendamentos para a visualizaÃ§Ã£o de Semana ou Dia
  const fetchPeriodAgendamentos = useCallback(async () => {
    const curDate = new Date(`${selectedDate}T00:00:00`);
    let start: Date;
    let end: Date;

    if (viewMode === 'semana') {
      start = getStartOfWeek(curDate);
      end = getEndOfWeek(curDate);
    } else {
      start = getStartOfDay(curDate);
      end = getEndOfDay(curDate);
    }

    let q = supabase
      .from('agendamentos')
      .select(
        '*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone, email), profissional:profissionais(id, name, specialty)',
      )
      .gte('data_inicio', start.toISOString())
      .lte('data_inicio', end.toISOString())
      .order('data_inicio', { ascending: true });

    if (isBarbeiro && usuario?.profissional_id) {
      q = q.eq('professional_id', usuario.profissional_id);
    } else if (isMaster && profissionalFilter) {
      q = q.eq('professional_id', profissionalFilter);
    }

    const { data } = await q;

    setPeriodAgendamentos((data as AgendamentoDayItem[]) ?? []);
  }, [selectedDate, viewMode, isMaster, isBarbeiro, usuario?.profissional_id, profissionalFilter]);

  useEffect(() => {
    if (viewMode === 'lista') {
      fetchListaAgendamentos();
    } else {
      fetchPeriodAgendamentos();
    }
  }, [viewMode, fetchListaAgendamentos, fetchPeriodAgendamentos]);

  const handleOpenDetail = async (ag: AgendamentoDayItem) => {
    setSelectedAg(ag);
    setModalOpen(true);
    const { data: bumpsData } = await supabase
      .from('vendas_bump')
      .select('*')
      .eq('agendamento_id', ag.id);
    setBumps((bumpsData as VendaBump[]) || []);
  };

  // Clique em espaÃ§o vazio na grade de horÃ¡rios abre o modal jÃ¡ preenchido (Task 12)
  const openCreateAt = (dateStr: string, timeStr: string) => {
    setCreateInitial({
      date: dateStr,
      time: timeStr,
      profissional: isBarbeiro
        ? (usuario?.profissional_id ?? '')
        : (isSchedulable(profissionalFilter) ? profissionalFilter : ''),
    });
    setCreateOpen(true);
  };

  const updateStatus = async (id: string, status: string) => {
    if (isBarbeiro) {
      const ag = agendamentos.find((a) => a.id === id) ?? periodAgendamentos.find((a) => a.id === id);
      if (!ag || ag.professional_id !== usuario?.profissional_id) return;
    }
    await supabase.from('agendamentos').update({ status }).eq('id', id);

    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
    setPeriodAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
    if (selectedAg?.id === id) {
      setSelectedAg((prev) => (prev ? { ...prev, status } : prev));
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (isBarbeiro) {
      const ag = agendamentos.find((a) => a.id === deleteTarget) ?? periodAgendamentos.find((a) => a.id === deleteTarget);
      if (!ag || ag.professional_id !== usuario?.profissional_id) { setDeleteTarget(null); return; }
    }
    const id = deleteTarget;
    setDeleteTarget(null);
    await supabase.from('agendamentos').delete().eq('id', id);
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    setPeriodAgendamentos((prev) => prev.filter((a) => a.id !== id));
    setModalOpen(false);
  };

  // Criar novo agendamento com validaÃ§Ã£o rigorosa de Double-Booking
  // (lÃ³gica extraÃ­da para o componente reutilizÃ¡vel NovoAgendamentoModal â€” Task 12)

  const totalPages = Math.ceil(count / pageSize);

  const shiftDate = (delta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    if (viewMode === 'semana') {
      d.setDate(d.getDate() + delta * 7);
    } else {
      d.setDate(d.getDate() + delta);
    }
    setSelectedDate(formatDateInput(d));
  };

  return (
    <AdminLayout>
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Agendamentos
          </h1>
          <p className="text-cream/50 text-sm">
            Gerencie a grade de horÃ¡rios da sua barbearia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Alternador de VisÃ£o: Semana (PadrÃ£o) | Dia | Lista */}
          <div className="flex w-full sm:w-auto flex-wrap items-center gap-1.5 bg-[#141414] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('semana')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'semana'
                  ? 'bg-highlight/15 text-highlight font-semibold'
                  : 'text-cream/60 hover:text-cream'
              )}
            >
              <CalendarDays size={15} />
              Semana
            </button>
            <button
              onClick={() => setViewMode('dia')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'dia'
                  ? 'bg-highlight/15 text-highlight font-semibold'
                  : 'text-cream/60 hover:text-cream'
              )}
            >
              <Calendar size={15} />
              Dia
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={cn(
                'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'lista'
                  ? 'bg-highlight/15 text-highlight font-semibold'
                  : 'text-cream/60 hover:text-cream'
              )}
            >
              <List size={15} />
              Lista
            </button>
          </div>

          {/* Filtro por profissional (master) */}
          {isMaster && (
            <div className="flex w-full sm:w-auto bg-[#141414] border border-white/10 rounded-xl px-2.5 py-1 items-center gap-1.5">
              <UserCircle2 size={15} className="text-cream/40 shrink-0" />
              <select
                value={profissionalFilter}
                onChange={(e) => setProfissionalFilter(e.target.value)}
                className="bg-transparent text-xs text-cream outline-none py-1.5 cursor-pointer w-full sm:w-auto min-w-0 flex-1 sm:flex-none"
                aria-label="Filtrar por profissional"
              >
                <option value="" className="bg-[#141414]">
                  Todos os profissionais
                </option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#141414]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Badge de escopo (barbeiro) */}
          {isBarbeiro && usuario?.profissional?.name && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-highlight bg-highlight/10 border border-highlight/20 px-2.5 py-1.5 rounded-xl">
              <UserCircle2 size={13} />
              Sua agenda: {usuario.profissional.name}
            </span>
          )}

          {/* BotÃ£o Novo Agendamento */}
          <Button
            onClick={() => {
              setCreateInitial({
                date: formatDateInput(new Date()),
                time: '09:00',
                profissional: isBarbeiro
                  ? (usuario?.profissional_id ?? '')
                  : (isSchedulable(profissionalFilter) ? profissionalFilter : ''),
              });
              setCreateOpen(true);
            }}
            className="w-full sm:w-auto justify-center bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
          >
            <Plus size={18} />
            Novo
          </Button>
        </div>
      </div>

      {/* ===================== VIEW DE SEMANA (PADRÃƒO GOOGLE CALENDAR) ===================== */}
      {viewMode === 'semana' && (
        <div className="space-y-4">
          {/* Barra de NavegaÃ§Ã£o da Semana */}
          <div className="flex items-center justify-between bg-[#121212] border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCalOpen('week')}
                className="inline-flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#F5F1EA] font-medium hover:border-highlight/40 transition-colors"
                aria-label="Escolher data da semana"
              >
                <Calendar size={14} className="text-highlight" />
                {formatDayMonth(new Date(`${selectedDate}T00:00:00`))}
              </button>
              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="PrÃ³xima semana"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-cream/50">
                Semana de {formatDayMonth(getStartOfWeek(new Date(`${selectedDate}T00:00:00`)))} a {formatDayMonth(getEndOfWeek(new Date(`${selectedDate}T00:00:00`)))}
              </span>
              <button
                onClick={() => setSelectedDate(formatDateInput(new Date()))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-cream/80 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Componente WeekView */}
          <WeekView
            currentDate={selectedDate}
            agendamentos={periodAgendamentos}
            onSelectEvent={handleOpenDetail}
            onSlotClick={openCreateAt}
            className="min-h-[580px]"
          />
        </div>
      )}

      {/* ===================== VIEW DE DIA ===================== */}
      {viewMode === 'dia' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121212] border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCalOpen('day')}
                className="inline-flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#F5F1EA] font-medium hover:border-highlight/40 transition-colors"
                aria-label="Escolher data do dia"
              >
                <Calendar size={14} className="text-highlight" />
                {formatDayMonth(new Date(`${selectedDate}T00:00:00`))}
              </button>
              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="PrÃ³ximo dia"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <span className="font-display text-lg text-[#F5F1EA] block capitalize">
                  {formatWeekday(new Date(`${selectedDate}T00:00:00`))}
                </span>
                <span className="text-[11px] text-cream/50">
                  {formatDayMonth(new Date(`${selectedDate}T00:00:00`))} â€” {periodAgendamentos.length} horÃ¡rios
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(formatDateInput(new Date()))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-cream/80 hover:bg-white/10 hover:text-white border border-white/10 transition-all"
              >
                Hoje
              </button>
            </div>
          </div>

          <DayView
            date={selectedDate}
            agendamentos={periodAgendamentos}
            onSelectEvent={handleOpenDetail}
            onSlotClick={openCreateAt}
            className="min-h-[580px]"
          />
        </div>
      )}

      {/* ===================== VIEW DE LISTA ===================== */}
      {viewMode === 'lista' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(0);
                }}
                placeholder="Buscar por cliente, serviÃ§o ou telefone..."
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['todos', 'agendado', 'concluido', 'cancelado'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(0);
                  }}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-medium transition-all border',
                    statusFilter === s
                      ? 'bg-highlight/15 text-highlight border-highlight/40 font-semibold'
                      : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white hover:bg-white/5'
                  )}
                >
                  {s === 'todos' ? 'Todos' : statusConfig[s]?.label ?? s}
                </button>
              ))}
            </div>
          </div>

          <Card className="p-0 overflow-hidden border-white/10 bg-[#121212]">
            {loading ? (
              <div className="p-12 text-center text-cream/40 text-sm">Carregando agendamentos...</div>
            ) : agendamentos.length === 0 ? (
              <div className="p-12 text-center text-cream/30">
                <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm text-[#F5F1EA] font-medium mb-1">Nenhum agendamento encontrado</p>
                <p className="text-xs text-cream/40">NÃ£o hÃ¡ reservas cadastradas para este filtro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5">Cliente</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5">ServiÃ§o</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5 hidden sm:table-cell">Barbeiro</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5 hidden md:table-cell">Data & Hora</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5 hidden lg:table-cell">Valor</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {agendamentos.map((ag) => {
                      const sc = statusConfig[ag.status] ?? statusConfig.agendado;
                      return (
                        <tr
                          key={ag.id}
                          onClick={() => handleOpenDetail(ag)}
                          className="hover:bg-white/[0.04] cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3.5">
                            <div className="text-[#F5F1EA] text-sm font-medium group-hover:text-highlight transition-colors">
                              {ag.cliente?.nome ?? 'â€”'}
                            </div>
                            <div className="text-xs text-cream/40">{ag.cliente?.telefone ?? ''}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs sm:text-sm text-cream/80">{ag.servico?.nome ?? 'â€”'}</span>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className="text-xs text-cream/60">
                              {ag.profissional?.name ?? 'â€”'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-xs text-cream/60">{formatDateTime(ag.data_inicio)}</span>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <span className="text-xs sm:text-sm text-highlight font-semibold">
                              {formatCurrency(ag.valor_servico)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={sc.variant}>{sc.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-cream/40">
                {page * pageSize + 1}â€“{Math.min((page + 1) * pageSize, count)} de {count} agendamentos
              </p>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg bg-white/5 text-cream/60 hover:text-white disabled:opacity-20 transition-all border border-white/10"
                  aria-label="PÃ¡gina anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1.5 text-xs text-cream/60 bg-white/5 rounded-lg border border-white/10">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 rounded-lg bg-white/5 text-cream/60 hover:text-white disabled:opacity-20 transition-all border border-white/10"
                  aria-label="PrÃ³xima pÃ¡gina"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: DETALHES DO AGENDAMENTO ===================== */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Detalhes do Agendamento">
        {selectedAg && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-xs text-cream/40 mb-1">Cliente</p>
                <p className="text-[#F5F1EA] font-medium text-sm">{selectedAg.cliente?.nome ?? 'NÃ£o identificado'}</p>
                {selectedAg.cliente?.telefone && (
                  <p className="text-xs text-cream/60 flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-highlight" />
                    {selectedAg.cliente.telefone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-cream/40 mb-1">ServiÃ§o</p>
                <p className="text-[#F5F1EA] font-medium text-sm">{selectedAg.servico?.nome ?? 'â€”'}</p>
                <p className="text-xs text-cream/60 flex items-center gap-1 mt-1">
                  <Clock size={12} className="text-highlight" />
                  {selectedAg.servico?.duracao_minutos ?? 30} min
                </p>
              </div>
            </div>

            {/* Barbeiro responsÃ¡vel */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <p className="text-xs text-cream/40 mb-1 flex items-center gap-1.5">
                <UserCircle2 size={13} className="text-highlight" /> Barbeiro
              </p>
              {selectedAg.profissional ? (
                <>
                  <p className="text-[#F5F1EA] font-medium text-sm">
                    {selectedAg.profissional.name}
                  </p>
                  {selectedAg.profissional.specialty && (
                    <p className="text-xs text-cream/60 mt-0.5">
                      {selectedAg.profissional.specialty}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-cream/50">
                  NÃ£o foi possÃ­vel identificar o barbeiro deste agendamento.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-cream/40 mb-1">Data e HorÃ¡rio</p>
                <p className="text-xs sm:text-sm text-[#F5F1EA] font-medium">
                  {formatDateTime(selectedAg.data_inicio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/40 mb-1">Valor do ServiÃ§o</p>
                <p className="font-display text-2xl text-highlight">
                  {formatCurrency(selectedAg.valor_servico)}
                </p>
              </div>
            </div>

            {bumps.length > 0 && (
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <p className="text-xs text-cream/40 mb-2 flex items-center gap-1.5 font-medium">
                  <Tag size={13} className="text-[#81FF4D]" /> Produtos Adicionais (Order Bump)
                </p>
                <div className="space-y-1">
                  {bumps.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs text-cream/80">
                      <span>Produto Adicional</span>
                      <span className="font-semibold text-[#81FF4D]">{formatCurrency(b.valor_pago)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedAg.observacoes && (
              <div>
                <p className="text-xs text-cream/40 mb-1">ObservaÃ§Ãµes</p>
                <p className="text-xs text-cream/70 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  {selectedAg.observacoes}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-cream/40 mb-2 font-medium">Alterar Status</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateStatus(selectedAg.id, key)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                      selectedAg.status === key
                        ? 'bg-highlight text-black border-highlight font-bold'
                        : 'bg-white/5 text-cream/60 border-white/10 hover:text-white hover:bg-white/10'
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <Button variant="danger" size="sm" onClick={() => handleDelete(selectedAg.id)}>
                <Trash2 size={15} />
                Excluir
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================== MODAL: + NOVO AGENDAMENTO (reutilizável — Task 12) ===================== */}
      <NovoAgendamentoModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitial(null);
        }}
        onCreated={() => {
          if (viewMode === 'lista') {
            fetchListaAgendamentos();
          } else {
            fetchPeriodAgendamentos();
          }
        }}
        initialDate={createInitial?.date}
        initialTime={createInitial?.time}
        initialProfissionalId={createInitial?.profissional}
      />

      {/* CalendÃ¡rios customizados (padrÃ£o "Mais datas") */}
      <CalendarModal
        open={calOpen === 'week'}
        mode="single"
        title="Escolher data"
        value={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setCalOpen(null)}
      />
      <CalendarModal
        open={calOpen === 'day'}
        mode="single"
        title="Escolher data"
        value={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setCalOpen(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir agendamento"
        message="Excluir este agendamento definitivamente? Essa aÃ§Ã£o nÃ£o pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
