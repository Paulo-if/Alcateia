import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  CalendarDays,
  Users,
  Wallet,
  TrendingUp,
  ArrowRight,
  Scissors,
  Plus,
  Phone,
  Clock,
  CheckCircle2,
  Trash2,
  Tag,
  UserCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Agendamento, Servico, TransacaoFinanceira, Cliente, VendaBump, Profissional } from '@/types';
import {
  formatCurrency,
  formatDateTime,
  formatDayMonth,
  formatWeekday,
  getStartOfDay,
  getEndOfDay,
  formatDateInput,
  cn,
} from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PeriodFilter, type DateRange } from '@/components/ui/PeriodFilter';
import { DayView, type AgendamentoDayItem } from '@/components/agenda/DayView';

interface DashboardData {
  receitaPeriodo: number;
  despesasPeriodo: number;
  lucroPeriodo: number;
  agendamentosPeriodo: number;
  concluidosPeriodo: number;
  totalClientes: number;
  ticketMedioPeriodo: number;
  receitaGrafico: { dia: string; valor: number }[];
  servicosPopulares: { nome: string; quantidade: number }[];
  agendaHoje: AgendamentoDayItem[];
}

const statusConfig: Record<string, { label: string; variant: 'gold' | 'success' | 'danger' | 'default' }> = {
  agendado: { label: 'Agendado', variant: 'gold' },
  concluido: { label: 'Concluído', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'danger' },
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtro de período do Dashboard: Inicia obrigatoriamente em "HOJE"
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      preset: 'today',
      startDate: getStartOfDay(now),
      endDate: getEndOfDay(now),
    };
  });

  // Modal de Detalhes do Agendamento selecionado na agenda
  const [selectedAg, setSelectedAg] = useState<AgendamentoDayItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bumps, setBumps] = useState<VendaBump[]>([]);

  // Filtro por profissional (somente master — barbeiro vê apenas a própria agenda via RLS)
  const { isMaster, isBarbeiro, usuario } = useAuth();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalFilter, setProfissionalFilter] = useState('');

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

  const fetchDashboard = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const startOfToday = getStartOfDay(now);
    const endOfToday = getEndOfDay(now);

    const startISO = dateRange.startDate.toISOString();
    const endISO = dateRange.endDate.toISOString();

    // Futuras queries de agendamento com filtro opcional de profissional (master)
    let periodoQ = supabase
      .from('agendamentos')
      .select('*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone)')
      .gte('data_inicio', startISO)
      .lte('data_inicio', endISO);
    let agendaHojeQ = supabase
      .from('agendamentos')
      .select('*, servico:servicos(id, nome, duracao_minutos), cliente:clientes(id, nome, telefone, email)')
      .gte('data_inicio', startOfToday.toISOString())
      .lte('data_inicio', endOfToday.toISOString())
      .order('data_inicio', { ascending: true });
    if (isMaster && profissionalFilter) {
      periodoQ = periodoQ.eq('professional_id', profissionalFilter);
      agendaHojeQ = agendaHojeQ.eq('professional_id', profissionalFilter);
    }

    const [
      { data: transacoesPeriodo },
      { data: agendamentosPeriodo },
      { data: clientes },
      { data: agendaHoje },
      { data: servicosData },
    ] = await Promise.all([
      // Faturamento e despesas estritamente do período selecionado
      supabase
        .from('transacoes_financeiras')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      // Agendamentos estritamente do período selecionado
      periodoQ,
      supabase.from('clientes').select('id'),
      // Agenda de HOJE exclusiva para o DayView
      agendaHojeQ,
      supabase.from('servicos').select('id, nome'),
    ]);

    const transList = (transacoesPeriodo as TransacaoFinanceira[] | null) ?? [];
    const agList = (agendamentosPeriodo as AgendamentoDayItem[] | null) ?? [];
    const agendaList = (agendaHoje as AgendamentoDayItem[] | null) ?? [];

    const receitas = transList.filter((t) => t.tipo === 'receita');
    const despesas = transList.filter((t) => t.tipo === 'despesa');

    const receitaPeriodo = receitas.reduce((sum, t) => sum + t.valor, 0);
    const despesasPeriodo = despesas.reduce((sum, t) => sum + t.valor, 0);
    const lucroPeriodo = receitaPeriodo - despesasPeriodo;

    const concluidosPeriodo = agList.filter((a) => a.status === 'concluido').length;
    const ticketMedioPeriodo = concluidosPeriodo > 0 ? receitaPeriodo / concluidosPeriodo : agList.length > 0 ? receitaPeriodo / agList.length : 0;

    // Calcular gráfico diário do período selecionado
    const diffTime = Math.abs(dateRange.endDate.getTime() - dateRange.startDate.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const diasParaGrafico = Math.min(diffDays, 31);

    const receitaGrafico: { dia: string; valor: number }[] = [];
    const stepDate = new Date(dateRange.startDate);

    for (let i = 0; i < diasParaGrafico; i++) {
      const cur = new Date(stepDate);
      cur.setDate(stepDate.getDate() + i);
      const diaString = formatDayMonth(cur);

      const diaValor = receitas
        .filter((t) => {
          const td = new Date(t.created_at);
          return (
            td.getDate() === cur.getDate() &&
            td.getMonth() === cur.getMonth() &&
            td.getFullYear() === cur.getFullYear()
          );
        })
        .reduce((sum, t) => sum + t.valor, 0);

      receitaGrafico.push({ dia: diaString, valor: diaValor });
    }

    // Serviços mais populares no período selecionado
    const servicoCount: Record<string, number> = {};
    agList.forEach((a) => {
      servicoCount[a.servico_id] = (servicoCount[a.servico_id] ?? 0) + 1;
    });

    const servicosPopulares = Object.entries(servicoCount)
      .map(([id, quantidade]) => ({
        nome: servicosData?.find((s) => s.id === id)?.nome ?? '—',
        quantidade,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    setData({
      receitaPeriodo,
      despesasPeriodo,
      lucroPeriodo,
      agendamentosPeriodo: agList.length,
      concluidosPeriodo,
      totalClientes: clientes?.length ?? 0,
      ticketMedioPeriodo,
      receitaGrafico,
      servicosPopulares,
      agendaHoje: agendaList,
    });
    setLoading(false);
  }, [dateRange, isMaster, profissionalFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSelectEvent = async (ag: AgendamentoDayItem) => {
    setSelectedAg(ag);
    setModalOpen(true);
    const { data: bumpsData } = await supabase
      .from('vendas_bump')
      .select('*')
      .eq('agendamento_id', ag.id);
    setBumps((bumpsData as VendaBump[]) || []);
  };

  // Regra Financeira Estrita:
  // Concluir gera receita (se não existir transação vinculada). Cancelar remove transação se houver.
  const updateStatus = async (id: string, status: string) => {
    await supabase.from('agendamentos').update({ status }).eq('id', id);

    if (status === 'concluido' && selectedAg) {
      // Verificar se já existe transação para este agendamento para evitar duplicidade
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
      // Se cancelado, remover qualquer transação vinculada
      await supabase.from('transacoes_financeiras').delete().eq('agendamento_id', id);
    }

    if (selectedAg?.id === id) {
      setSelectedAg((prev) => (prev ? { ...prev, status } : prev));
    }
    fetchDashboard();
  };

  const handleDeleteAgendamento = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;
    await supabase.from('transacoes_financeiras').delete().eq('agendamento_id', id);
    await supabase.from('agendamentos').delete().eq('id', id);
    setModalOpen(false);
    fetchDashboard();
  };

  const today = new Date();

  return (
    <AdminLayout>
      {/* Header com Filtro de Período Integrado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Painel
          </h1>
          <p className="text-cream/50 text-sm capitalize">
            {formatWeekday(today)}, {formatDayMonth(today)}
            {isBarbeiro && usuario?.profissional?.name
              ? ` • Sua agenda (${usuario.profissional.name})`
              : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtro por profissional (master) */}
          {isMaster && profissionais.length > 0 && (
            <div className="flex bg-[#141414] border border-white/10 rounded-xl px-2.5 py-1 items-center gap-1.5">
              <UserCircle2 size={15} className="text-cream/40 shrink-0" />
              <select
                value={profissionalFilter}
                onChange={(e) => setProfissionalFilter(e.target.value)}
                className="bg-transparent text-xs text-cream outline-none py-1.5 cursor-pointer"
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
          <PeriodFilter value={dateRange} onChange={setDateRange} />
          <Link to="/admin/agendamentos">
            <Button className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black hover:opacity-90 shadow-lg shadow-highlight/20 font-semibold">
              <Plus size={18} />
              Novo Agendamento
            </Button>
          </Link>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-72">
          <div className="text-cream/40 text-sm animate-pulse">Carregando dados do painel...</div>
        </div>
      ) : (
        <>
          {/* Indicadores / KPIs Responsivos ao Período */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-8">
            <Card className="animate-fade-in-up border-white/10 bg-[#121212]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-highlight/10 text-highlight">
                  <Wallet size={20} />
                </div>
              </div>
              <div className="font-display text-3xl text-[#F5F1EA] mb-0.5">
                {formatCurrency(data.receitaPeriodo)}
              </div>
              <div className="text-xs text-cream/50">
                Faturamento ({dateRange.preset === 'today' ? 'Hoje' : dateRange.preset === 'week' ? 'Esta Semana' : dateRange.preset === 'month' ? 'Este Mês' : 'Período'})
              </div>
            </Card>

            <Card className="animate-fade-in-up border-white/10 bg-[#121212]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#81FF4D]/10 text-[#81FF4D]">
                  <CalendarDays size={20} />
                </div>
              </div>
              <div className="font-display text-3xl text-[#F5F1EA] mb-0.5">
                {data.agendamentosPeriodo}
              </div>
              <div className="text-xs text-cream/50">
                Atendimentos ({data.concluidosPeriodo} concluídos)
              </div>
            </Card>

            <Card className="animate-fade-in-up border-white/10 bg-[#121212]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-[#C5A572]">
                  <Users size={20} />
                </div>
              </div>
              <div className="font-display text-3xl text-[#F5F1EA] mb-0.5">
                {data.totalClientes}
              </div>
              <div className="text-xs text-cream/50">Total de Clientes</div>
            </Card>

            <Card className="animate-fade-in-up border-white/10 bg-[#121212]">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="font-display text-3xl text-[#F5F1EA] mb-0.5">
                {formatCurrency(data.ticketMedioPeriodo)}
              </div>
              <div className="text-xs text-cream/50">Ticket Médio</div>
            </Card>
          </div>

          {/* Seção Principal: Agenda de Hoje + Gráficos */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Agenda de Hoje — Visual Estilo Google Calendar */}
            <div className="lg:col-span-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
                    Agenda de Hoje
                  </h3>
                  <p className="text-xs text-cream/50">
                    {data.agendaHoje.length} {data.agendaHoje.length === 1 ? 'reserva' : 'reservas'} hoje
                  </p>
                </div>
                <Link
                  to="/admin/agendamentos"
                  className="text-xs text-highlight hover:underline flex items-center gap-1 font-medium"
                >
                  Ver semana completa <ArrowRight size={13} />
                </Link>
              </div>

              <DayView
                date={today}
                agendamentos={data.agendaHoje}
                onSelectEvent={handleSelectEvent}
                compact
                className="flex-1 min-h-[460px]"
              />
            </div>

            {/* Gráfico de Evolução e Faturamento do Período */}
            <Card className="lg:col-span-2 border-white/10 bg-[#121212] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
                    Evolução do Faturamento
                  </h3>
                  <span className="text-xs text-highlight font-medium bg-highlight/10 px-2.5 py-1 rounded-lg">
                    {formatCurrency(data.receitaPeriodo)}
                  </span>
                </div>
                <p className="text-xs text-cream/40 mb-6">
                  Receita diária acumulada no intervalo selecionado
                </p>
              </div>

              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.receitaGrafico}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4FE7FF" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4FE7FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis
                      dataKey="dia"
                      stroke="rgba(245, 245, 245, 0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(245, 245, 245, 0.4)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#181818',
                        border: '1px solid rgba(79, 231, 255, 0.3)',
                        borderRadius: '12px',
                        color: '#F5F1EA',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      }}
                      formatter={(v) => [formatCurrency(Number(v)), 'Receita']}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="#4FE7FF"
                      strokeWidth={2.5}
                      fill="url(#colorReceita)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Serviços Mais Populares & Atalhos */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-white/10 bg-[#121212]">
              <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide mb-1">
                Serviços Mais Populares
              </h3>
              <p className="text-xs text-cream/40 mb-6">Mais solicitados no período selecionado</p>
              {data.servicosPopulares.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.servicosPopulares}
                      dataKey="quantidade"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {data.servicosPopulares.map((_, i) => {
                        const colors = ['#4FE7FF', '#C5A572', '#81FF4D', '#a78bfa', '#38bdf8'];
                        return <Cell key={i} fill={colors[i % colors.length]} stroke="rgba(0,0,0,0.4)" />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#181818',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        color: '#F5F1EA',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', color: '#F5F1EA' }}
                      formatter={(v) => <span style={{ color: 'rgba(245, 241, 234, 0.7)' }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-cream/30 text-xs">
                  Sem agendamentos no período selecionado
                </div>
              )}
            </Card>

            <Card className="border-white/10 bg-[#121212]">
              <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide mb-1">
                Ações Rápidas
              </h3>
              <p className="text-xs text-cream/40 mb-6">Atalhos principais de gestão</p>
              <div className="space-y-3">
                {(
                  isMaster
                    ? [
                        { to: '/admin/agendamentos', icon: CalendarDays, label: 'Gerenciar Agendamentos', desc: 'Ver calendário completo e agendamentos' },
                        { to: '/admin/clientes', icon: Users, label: 'Gerenciar Clientes', desc: 'Lista e histórico de clientes' },
                        { to: '/admin/servicos', icon: Scissors, label: 'Serviços & Produtos', desc: 'Editar catálogo e fotos' },
                        { to: '/admin/financeiro', icon: Wallet, label: 'Lançar Transação', desc: 'Registrar receitas e despesas da barbearia' },
                      ]
                    : [
                        { to: '/admin/agendamentos', icon: CalendarDays, label: 'Gerenciar Agendamentos', desc: 'Ver calendário completo e agendamentos' },
                        { to: '/admin/clientes', icon: Users, label: 'Gerenciar Clientes', desc: 'Lista e histórico de clientes' },
                        { to: '/admin/financeiro', icon: Wallet, label: 'Minhas Comissões', desc: 'Ver meus atendimentos e vendas' },
                      ]
                ).map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-highlight/30 hover:bg-white/[0.06] transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0 text-highlight">
                      <link.icon size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-[#F5F1EA] font-medium group-hover:text-highlight transition-colors">
                        {link.label}
                      </p>
                      <p className="text-[11px] text-cream/40 truncate">{link.desc}</p>
                    </div>
                    <ArrowRight size={15} className="text-cream/30 group-hover:text-highlight transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Modal de Detalhes do Agendamento */}
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
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteAgendamento(selectedAg.id)}
              >
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
    </AdminLayout>
  );
}
