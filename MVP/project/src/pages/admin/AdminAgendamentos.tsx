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
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Agendamento, Servico, Cliente, VendaBump } from '@/types';
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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { ServiceSearchSelect } from '@/components/ui/ServiceSearchSelect';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { DayView, type AgendamentoDayItem } from '@/components/agenda/DayView';
import { WeekView } from '@/components/agenda/WeekView';

const statusConfig: Record<string, { label: string; variant: 'gold' | 'success' | 'danger' | 'default' }> = {
  agendado: { label: 'Agendado', variant: 'gold' },
  concluido: { label: 'Concluído', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
};

type ViewMode = 'semana' | 'dia' | 'lista';

export function AdminAgendamentos() {
  // Visualização padrão obrigatória: SEMANA
  const [viewMode, setViewMode] = useState<ViewMode>('semana');
  const [agendamentos, setAgendamentos] = useState<AgendamentoDayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [selectedAg, setSelectedAg] = useState<AgendamentoDayItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bumps, setBumps] = useState<VendaBump[]>([]);
  const pageSize = 12;

  // Data central de navegação da agenda (inicia hoje)
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateInput(new Date())
  );

  // Agendamentos para o período visível (semana ou dia)
  const [periodAgendamentos, setPeriodAgendamentos] = useState<AgendamentoDayItem[]>([]);

  // Create form state
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [newServicoId, setNewServicoId] = useState('');
  const [newDate, setNewDate] = useState(formatDateInput(new Date()));
  const [newTime, setNewTime] = useState('09:00');
  const [newNome, setNewNome] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newObs, setNewObs] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Buscar lista de agendamentos para a visão Lista
  const fetchListaAgendamentos = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('agendamentos')
      .select(
        '*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone, email)',
        { count: 'exact' },
      )
      .order('data_inicio', { ascending: false });

    if (statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
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
  }, [page, statusFilter, search]);

  // Buscar agendamentos para a visualização de Semana ou Dia
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

    const { data } = await supabase
      .from('agendamentos')
      .select(
        '*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone, email)',
      )
      .gte('data_inicio', start.toISOString())
      .lte('data_inicio', end.toISOString())
      .order('data_inicio', { ascending: true });

    setPeriodAgendamentos((data as AgendamentoDayItem[]) ?? []);
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (viewMode === 'lista') {
      fetchListaAgendamentos();
    } else {
      fetchPeriodAgendamentos();
    }
  }, [viewMode, fetchListaAgendamentos, fetchPeriodAgendamentos]);

  useEffect(() => {
    (async () => {
      const { data: servData } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      setServicos((servData as Servico[]) ?? []);
    })();
  }, []);

  const handleOpenDetail = async (ag: AgendamentoDayItem) => {
    setSelectedAg(ag);
    setModalOpen(true);
    const { data: bumpsData } = await supabase
      .from('vendas_bump')
      .select('*')
      .eq('agendamento_id', ag.id);
    setBumps((bumpsData as VendaBump[]) || []);
  };

  // Clique em espaço vazio na grade de horários abre o modal já preenchido
  const handleSlotClick = (dateStr: string, timeStr: string) => {
    setNewDate(dateStr);
    setNewTime(timeStr);
    setCreateError(null);
    setCreateOpen(true);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('agendamentos').update({ status }).eq('id', id);

    // Regra Financeira: Concluir gera receita (se não existir). Cancelar remove transação vinculada.
    if (status === 'concluido' && selectedAg) {
      const { data: existingTrans } = await supabase
        .from('transacoes_financeiras')
        .select('id')
        .eq('agendamento_id', id)
        .maybeSingle();

      if (!existingTrans) {
        await supabase.from('transacoes_financeiras').insert({
          tipo: 'receita',
          valor: selectedAg.valor_servico,
          descricao: `Atendimento Concluído: ${selectedAg.servico?.nome ?? 'Serviço'} (${selectedAg.cliente?.nome ?? 'Cliente'})`,
          categoria: 'servico',
          agendamento_id: id,
        });
      }
    } else if (status === 'cancelado') {
      await supabase.from('transacoes_financeiras').delete().eq('agendamento_id', id);
    }

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
    if (!window.confirm('Excluir este agendamento definitivamente?')) return;
    await supabase.from('transacoes_financeiras').delete().eq('agendamento_id', id);
    await supabase.from('agendamentos').delete().eq('id', id);
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    setPeriodAgendamentos((prev) => prev.filter((a) => a.id !== id));
    setModalOpen(false);
  };

  // Criar novo agendamento com validação rigorosa de Double-Booking
  const handleCreate = async () => {
    setCreateError(null);

    if (!newServicoId) {
      setCreateError('Por favor, selecione um serviço.');
      return;
    }
    if (!newDate || !newTime) {
      setCreateError('Selecione data e horário para o agendamento.');
      return;
    }
    if (!newNome.trim()) {
      setCreateError('Informe o nome do cliente.');
      return;
    }
    if (!newTelefone.trim()) {
      setCreateError('Informe o telefone do cliente.');
      return;
    }

    setCreating(true);
    try {
      const servico = servicos.find((s) => s.id === newServicoId);
      if (!servico) {
        setCreateError('Serviço inválido.');
        setCreating(false);
        return;
      }

      const dataInicio = new Date(`${newDate}T${newTime}:00`);
      const duracaoMs = (servico.duracao_minutos || 30) * 60 * 1000;
      const dataFim = new Date(dataInicio.getTime() + duracaoMs);

      // Prevenção estrita de Double-Booking: candidateStart < existingEnd AND candidateEnd > existingStart
      const { data: conflitos, error: checkError } = await supabase
        .from('agendamentos')
        .select('id, data_inicio, data_fim')
        .neq('status', 'cancelado')
        .lt('data_inicio', dataFim.toISOString())
        .gt('data_fim', dataInicio.toISOString());

      if (checkError) {
        setCreateError('Erro ao validar disponibilidade de horário.');
        setCreating(false);
        return;
      }

      if (conflitos && conflitos.length > 0) {
        setCreateError('⚠️ Horário indisponível! Já existe um agendamento reservado neste intervalo.');
        setCreating(false);
        return;
      }

      // Encontrar ou criar cliente
      let clienteId: string | null = null;
      const { data: existingCli } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', newTelefone.trim())
        .maybeSingle();

      if (existingCli) {
        clienteId = existingCli.id;
      } else {
        const { data: newCli } = await supabase
          .from('clientes')
          .insert({ nome: newNome.trim(), telefone: newTelefone.trim() })
          .select('id')
          .single();
        if (newCli) clienteId = newCli.id;
      }

      // Inserir agendamento (STATUS: 'agendado' — não gera receita antes de concluir!)
      const { data: novoAgendamento, error: insertError } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id: clienteId,
          servico_id: newServicoId,
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          status: 'agendado',
          valor_servico: servico.preco,
          observacoes: newObs.trim() || null,
        })
        .select('*')
        .single();

      if (insertError || !novoAgendamento) {
        setCreateError('Erro ao salvar agendamento.');
        setCreating(false);
        return;
      }

      // Limpar formulário e fechar modal
      setCreateOpen(false);
      setNewNome('');
      setNewTelefone('');
      setNewObs('');
      setNewServicoId('');

      // Atualizar lista e agenda imediatamente
      if (viewMode === 'lista') {
        fetchListaAgendamentos();
      } else {
        fetchPeriodAgendamentos();
      }
    } catch {
      setCreateError('Ocorreu um erro ao processar o agendamento.');
    }
    setCreating(false);
  };

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

  // Horários ocupados no dia selecionado para o TimeSlotPicker
  const occupiedSlots = periodAgendamentos
    .filter((a) => a.status !== 'cancelado' && formatDateInput(new Date(a.data_inicio)) === newDate)
    .map((a) => {
      const dt = new Date(a.data_inicio);
      return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
    });

  return (
    <AdminLayout>
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Agendamentos
          </h1>
          <p className="text-cream/50 text-sm">
            Gerencie a grade de horários da sua barbearia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Alternador de Visão: Semana (Padrão) | Dia | Lista */}
          <div className="flex bg-[#141414] border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('semana')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                viewMode === 'lista'
                  ? 'bg-highlight/15 text-highlight font-semibold'
                  : 'text-cream/60 hover:text-cream'
              )}
            >
              <List size={15} />
              Lista
            </button>
          </div>

          {/* Botão Novo Agendamento */}
          <Button
            onClick={() => {
              setNewDate(formatDateInput(new Date()));
              setNewTime('09:00');
              setCreateOpen(true);
            }}
            className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
          >
            <Plus size={18} />
            Novo
          </Button>
        </div>
      </div>

      {/* ===================== VIEW DE SEMANA (PADRÃO GOOGLE CALENDAR) ===================== */}
      {viewMode === 'semana' && (
        <div className="space-y-4">
          {/* Barra de Navegação da Semana */}
          <div className="flex items-center justify-between bg-[#121212] border border-white/10 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#F5F1EA] font-medium"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Próxima semana"
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
            onSlotClick={handleSlotClick}
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
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#F5F1EA] font-medium"
              />
              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-xl bg-white/5 text-cream/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Próximo dia"
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
                  {formatDayMonth(new Date(`${selectedDate}T00:00:00`))} — {periodAgendamentos.length} horários
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
            onSlotClick={handleSlotClick}
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
                placeholder="Buscar por cliente, serviço ou telefone..."
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
                <p className="text-xs text-cream/40">Não há reservas cadastradas para este filtro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5">Cliente</th>
                      <th className="text-left text-xs text-cream/40 font-medium px-5 py-3.5">Serviço</th>
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
                              {ag.cliente?.nome ?? '—'}
                            </div>
                            <div className="text-xs text-cream/40">{ag.cliente?.telefone ?? ''}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs sm:text-sm text-cream/80">{ag.servico?.nome ?? '—'}</span>
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
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)} de {count} agendamentos
              </p>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 rounded-lg bg-white/5 text-cream/60 hover:text-white disabled:opacity-20 transition-all border border-white/10"
                  aria-label="Página anterior"
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
                  aria-label="Próxima página"
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
                <p className="text-[#F5F1EA] font-medium text-sm">{selectedAg.cliente?.nome ?? 'Não identificado'}</p>
                {selectedAg.cliente?.telefone && (
                  <p className="text-xs text-cream/60 flex items-center gap-1 mt-1">
                    <Phone size={12} className="text-highlight" />
                    {selectedAg.cliente.telefone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-cream/40 mb-1">Serviço</p>
                <p className="text-[#F5F1EA] font-medium text-sm">{selectedAg.servico?.nome ?? '—'}</p>
                <p className="text-xs text-cream/60 flex items-center gap-1 mt-1">
                  <Clock size={12} className="text-highlight" />
                  {selectedAg.servico?.duracao_minutos ?? 30} min
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-cream/40 mb-1">Data e Horário</p>
                <p className="text-xs sm:text-sm text-[#F5F1EA] font-medium">
                  {formatDateTime(selectedAg.data_inicio)}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/40 mb-1">Valor do Serviço</p>
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
                <p className="text-xs text-cream/40 mb-1">Observações</p>
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

      {/* ===================== MODAL: + NOVO AGENDAMENTO ===================== */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo Agendamento"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">
              Serviço *
            </label>
            <ServiceSearchSelect
              servicos={servicos}
              value={newServicoId}
              onChange={setNewServicoId}
              error={!!createError && !newServicoId}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">
              Data do Agendamento *
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            />
          </div>

          <div>
            <TimeSlotPicker
              value={newTime}
              onChange={setNewTime}
              disabledTimes={occupiedSlots}
            />
          </div>

          <div className="pt-3 border-t border-white/10 space-y-3">
            <p className="text-xs font-semibold text-[#F5F1EA]">Dados do Cliente</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-cream/50 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-cream/50 mb-1">Telefone *</label>
                <input
                  type="tel"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-cream/50 mb-1">Observações</label>
              <textarea
                value={newObs}
                onChange={(e) => setNewObs(e.target.value)}
                placeholder="Ex: Cliente prefere corte na tesoura..."
                rows={2}
                className="w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F5F1EA] placeholder:text-cream/30 focus:outline-none focus:border-highlight/50 resize-none"
              />
            </div>
          </div>

          {createError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
            >
              {creating ? 'Salvando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
