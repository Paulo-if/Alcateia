import { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { TransacaoFinanceira } from '@/types';
import {
  formatCurrency,
  formatDate,
  getStartOfMonth,
  getEndOfMonth,
  cn,
} from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PeriodFilter, type DateRange } from '@/components/ui/PeriodFilter';
import { useAuth } from '@/hooks/useAuth';
import { ComissaoBarbeiro } from '@/components/admin/ComissaoBarbeiro';
import { fetchFinanceiroPeriodo, fetchFinanceiroPorDia, type FinanceiroPeriodo } from '@/lib/financeService';

const categorias = ['servico', 'produto', 'aluguel', 'salario', 'equipamento', 'marketing', 'outros'];

export function AdminFinanceiro() {
  const { isBarbeiro } = useAuth();
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [financ, setFinanc] = useState<FinanceiroPeriodo | null>(null);
  const [chartData, setChartData] = useState<{ dia: string; receita: number; despesa: number; saldo: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Filtro de período unificado (default: este mês)
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      preset: 'month',
      startDate: getStartOfMonth(now),
      endDate: getEndOfMonth(now),
    };
  });

  // Controle de visibilidade das séries do gráfico
  const [visibleSeries, setVisibleSeries] = useState<{
    receitas: boolean;
    despesas: boolean;
    saldo: boolean;
  }>({
    receitas: true,
    despesas: true,
    saldo: true,
  });

  const toggleSeries = (key: 'receitas' | 'despesas' | 'saldo') => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Form state
  const [formTipo, setFormTipo] = useState<'receita' | 'despesa'>('despesa');
  const [formValor, setFormValor] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState('outros');
  const [saving, setSaving] = useState(false);

  const fetchTransacoes = useCallback(async () => {
    setLoading(true);
    const startISO = dateRange.startDate.toISOString();
    const endISO = dateRange.endDate.toISOString();

    // Fonte de verdade única (financeService) para KPIs e gráfico
    const [financData, diaData, { data }] = await Promise.all([
      fetchFinanceiroPeriodo(dateRange),
      fetchFinanceiroPorDia(dateRange),
      supabase
        .from('transacoes_financeiras')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false }),
    ]);

    setFinanc(financData);
    setChartData(diaData);
    setTransacoes((data as TransacaoFinanceira[]) ?? []);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchTransacoes();
  }, [fetchTransacoes]);

  const totalReceitas = financ?.receita ?? 0;
  const totalDespesas = financ?.despesas ?? 0;
  const saldo = financ?.saldo ?? 0;

  const handleCreate = async () => {
    if (!formValor || parseFloat(formValor) <= 0) return;
    setSaving(true);
    await supabase.from('transacoes_financeiras').insert({
      tipo: formTipo,
      valor: parseFloat(formValor),
      descricao: formDescricao || null,
      categoria: formCategoria,
    });
    setSaving(false);
    setCreateOpen(false);
    setFormValor('');
    setFormDescricao('');
    setFormCategoria('outros');
    setFormTipo('despesa');
    fetchTransacoes();
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    await supabase.from('transacoes_financeiras').delete().eq('id', id);
    fetchTransacoes();
  };

  const stats = [
    { label: 'Receita no Período', value: formatCurrency(totalReceitas), icon: TrendingUp, color: 'text-[#81FF4D]', bg: 'bg-[#81FF4D]/10' },
    { label: 'Despesas no Período', value: formatCurrency(totalDespesas), icon: TrendingDown, color: 'text-[#F51D1D]', bg: 'bg-[#F51D1D]/10' },
    { label: 'Saldo Líquido', value: formatCurrency(saldo), icon: Wallet, color: saldo >= 0 ? 'text-highlight' : 'text-[#F51D1D]', bg: 'bg-highlight/10' },
    { label: 'Transações', value: transacoes.length.toString(), icon: Receipt, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <AdminLayout>
      {isBarbeiro ? (
        <ComissaoBarbeiro />
      ) : (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Financeiro
          </h1>
          <p className="text-cream/50 text-sm">
            Fluxo de caixa, relatórios de faturamento e controle de custos.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodFilter value={dateRange} onChange={setDateRange} />
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold shadow-lg shadow-highlight/20"
          >
            <Plus size={18} />
            Lançar Transação
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6">
        {stats.map((stat, i) => (
          <Card key={i} className="animate-fade-in-up border-white/10 bg-[#121212]">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="font-display text-2xl sm:text-3xl text-[#F5F1EA] mb-0.5 break-words leading-tight">{stat.value}</div>
            <div className="text-xs text-cream/50">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Gráfico Financeiro Interativo com Linhas + Áreas e Filtros Clicáveis */}
      <Card className="mb-6 border-white/10 bg-[#121212]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
          <div>
            <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
              Evolução Financeira
            </h3>
            <p className="text-xs text-cream/40">
              Acompanhamento detalhado das entradas, saídas e saldo
            </p>
          </div>

          {/* Filtros Interativos / Botões Reais da Legenda */}
          <div className="flex items-center gap-2 flex-wrap select-none">
            {/* Toggle Receitas */}
            <button
              type="button"
              onClick={() => toggleSeries('receitas')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                visibleSeries.receitas
                  ? 'bg-highlight/15 text-highlight border-highlight/40 shadow-sm opacity-100'
                  : 'bg-white/5 text-cream/35 border-white/5 opacity-40 hover:opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#4FE7FF]" />
              <span>Receitas</span>
              {visibleSeries.receitas && <Check size={12} className="text-highlight" />}
            </button>

            {/* Toggle Despesas */}
            <button
              type="button"
              onClick={() => toggleSeries('despesas')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                visibleSeries.despesas
                  ? 'bg-danger/15 text-danger border-danger/40 shadow-sm opacity-100'
                  : 'bg-white/5 text-cream/35 border-white/5 opacity-40 hover:opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#F51D1D]" />
              <span>Despesas</span>
              {visibleSeries.despesas && <Check size={12} className="text-danger" />}
            </button>

            {/* Toggle Saldo Líquido */}
            <button
              type="button"
              onClick={() => toggleSeries('saldo')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                visibleSeries.saldo
                  ? 'bg-[#81FF4D]/15 text-[#81FF4D] border-[#81FF4D]/40 shadow-sm opacity-100'
                  : 'bg-white/5 text-cream/35 border-white/5 opacity-40 hover:opacity-60'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-[#81FF4D]" />
              <span>Saldo Líquido</span>
              {visibleSeries.saldo && <Check size={12} className="text-[#81FF4D]" />}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-cream/40 text-xs">Carregando gráfico...</div>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  {/* Gradiente Sutil Receitas */}
                  <linearGradient id="colorFinReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FE7FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4FE7FF" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Gradiente Sutil Despesas */}
                  <linearGradient id="colorFinDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F51D1D" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F51D1D" stopOpacity={0.0} />
                  </linearGradient>
                  {/* Gradiente Sutil Saldo */}
                  <linearGradient id="colorFinSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#81FF4D" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#81FF4D" stopOpacity={0.0} />
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

                {/* Tooltip Dark Mode Customizado */}
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0A0A0A] border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-xl min-w-[160px]">
                          <p className="text-xs font-semibold text-[#F5F1EA] mb-2 border-b border-white/10 pb-1">
                            {label}
                          </p>
                          <div className="space-y-1.5 text-xs">
                            {payload.map((item: any) => {
                              const isRec = item.dataKey === 'receita';
                              const isDesp = item.dataKey === 'despesa';
                              const isSal = item.dataKey === 'saldo';

                              const labelName = isRec ? 'Receitas' : isDesp ? 'Despesas' : 'Saldo';
                              const colorHex = isRec ? '#4FE7FF' : isDesp ? '#F51D1D' : '#81FF4D';

                              return (
                                <div key={item.dataKey} className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-1.5 text-cream/60 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
                                    {labelName}:
                                  </span>
                                  <span className="font-semibold" style={{ color: colorHex }}>
                                    {formatCurrency(Number(item.value))}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Área + Linha: Receitas */}
                {visibleSeries.receitas && (
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#4FE7FF"
                    strokeWidth={2.5}
                    fill="url(#colorFinReceitas)"
                    dot={false}
                    activeDot={{ r: 5, stroke: '#121212', strokeWidth: 2, fill: '#4FE7FF' }}
                    name="Receitas"
                  />
                )}

                {/* Área + Linha: Despesas */}
                {visibleSeries.despesas && (
                  <Area
                    type="monotone"
                    dataKey="despesa"
                    stroke="#F51D1D"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#colorFinDespesas)"
                    dot={false}
                    activeDot={{ r: 5, stroke: '#121212', strokeWidth: 2, fill: '#F51D1D' }}
                    name="Despesas"
                  />
                )}

                {/* Linha: Saldo Líquido */}
                {visibleSeries.saldo && (
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#81FF4D"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, stroke: '#121212', strokeWidth: 2, fill: '#81FF4D' }}
                    name="Saldo Líquido"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Lista de Transações Recentes */}
      <Card className="border-white/10 bg-[#121212]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
            Transações do Período
          </h3>
          <span className="text-xs text-cream/40">
            {transacoes.length} {transacoes.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {transacoes.length === 0 ? (
          <div className="py-12 text-center text-cream/30">
            <Receipt size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[#F5F1EA] font-medium mb-1">Nenhuma transação no período</p>
            <p className="text-xs text-cream/40">Ajuste o filtro de data acima ou registre um novo lançamento.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {transacoes.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      t.tipo === 'receita' ? 'bg-[#81FF4D]/10 text-[#81FF4D]' : 'bg-[#F51D1D]/10 text-[#F51D1D]'
                    )}
                  >
                    {t.tipo === 'receita' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div className="truncate">
                    <p className="text-xs sm:text-sm text-[#F5F1EA] font-medium truncate">
                      {t.descricao ?? t.categoria ?? 'Transação'}
                    </p>
                    <p className="text-[11px] text-cream/40">
                      {formatDate(t.created_at)}
                      {t.categoria && t.categoria !== 'servico' && ` • ${t.categoria}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      'font-display text-lg sm:text-xl',
                      t.tipo === 'receita' ? 'text-[#81FF4D]' : 'text-[#F51D1D]'
                    )}
                  >
                    {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(t.valor)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-cream/30 hover:text-[#F51D1D] sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                    aria-label="Excluir transação"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de Lançamento */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Lançar Transação">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Tipo de Movimentação *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormTipo('receita')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                  formTipo === 'receita'
                    ? 'bg-[#81FF4D]/15 text-[#81FF4D] border-[#81FF4D]/40 shadow-sm'
                    : 'bg-[#121212] text-cream/50 border-white/10'
                )}
              >
                <TrendingUp size={15} />
                Receita (Entrada)
              </button>
              <button
                type="button"
                onClick={() => setFormTipo('despesa')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                  formTipo === 'despesa'
                    ? 'bg-[#F51D1D]/15 text-[#F51D1D] border-[#F51D1D]/40 shadow-sm'
                    : 'bg-[#121212] text-cream/50 border-white/10'
                )}
              >
                <TrendingDown size={15} />
                Despesa (Saída)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              value={formValor}
              onChange={(e) => setFormValor(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Categoria</label>
            <select
              value={formCategoria}
              onChange={(e) => setFormCategoria(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Descrição</label>
            <textarea
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Ex: Compra de lâminas e toalhas descartáveis..."
              rows={2}
              className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !formValor || parseFloat(formValor) <= 0}
              className="bg-gradient-to-r from-highlight to-[#2bd4ef] text-black font-semibold"
            >
              {saving ? 'Salvando...' : 'Confirmar Lançamento'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir transação"
        message="Excluir esta transação? Essa ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
        </>
      )}
    </AdminLayout>
  );
}
