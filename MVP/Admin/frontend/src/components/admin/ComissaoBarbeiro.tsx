import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Scissors,
  Tag,
  TrendingUp,
  Receipt,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Agendamento, VendaBump, Produto } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import {
  formatCurrency,
  formatDateTime,
  getStartOfMonth,
  getEndOfMonth,
  cn,
} from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { PeriodFilter, type DateRange } from '@/components/ui/PeriodFilter';
import { fetchFinanceiroPeriodo, type FinanceiroPeriodo } from '@/lib/financeService';

interface ServicoRealizado {
  id: string;
  servicoNome: string;
  clienteNome: string;
  dataInicio: string;
  valor: number;
  bumps: VendaBump[];
}

export function ComissaoBarbeiro() {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    return {
      preset: 'month',
      startDate: getStartOfMonth(now),
      endDate: getEndOfMonth(now),
    };
  });

  const [servicos, setServicos] = useState<ServicoRealizado[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [financ, setFinanc] = useState<FinanceiroPeriodo | null>(null);

  // Soma de bumps deriva de servicos[].bumps rastreado por id
  const fetchData = useCallback(async () => {
    if (!usuario?.profissional_id) return;
    setLoading(true);

    const startISO = dateRange.startDate.toISOString();
    const endISO = dateRange.endDate.toISOString();

    // Fonte de verdade única (financeService) unificada para os totais
    const financeiro = fetchFinanceiroPeriodo(dateRange, {
      professionalId: usuario.profissional_id,
    });

    const [{ data: agData }, { data: prodData }] = await Promise.all([
      // Meus agendamentos no período (RLS já limita ao próprio profissional)
      supabase
        .from('agendamentos')
        .select(
          '*, servico:servicos(id, nome), cliente:clientes(id, nome, telefone), bumps:vendas_bump(*)',
        )
        .eq('professional_id', usuario.profissional_id)
        .gte('data_inicio', startISO)
        .lte('data_inicio', endISO)
        .order('data_inicio', { ascending: true }),
      supabase.from('produtos').select('*'),
    ]);

    const financData = await financeiro;

    const agList = (agData ?? []) as Array<
      Agendamento & {
        servico?: { id: string; nome: string } | null;
        cliente?: { id: string; nome: string; telefone: string | null } | null;
        bumps?: VendaBump[] | null;
      }
    >;

    // Apenas atendimentos CONCLUÍDOS geram receita para o barbeiro.
    const servicosRealizados: ServicoRealizado[] = agList
      .filter((a) => a.status === 'concluido')
      .map((a) => ({
        id: a.id,
        servicoNome: a.servico?.nome ?? 'Serviço',
        clienteNome: a.cliente?.nome ?? 'Cliente',
        dataInicio: a.data_inicio,
        valor: a.valor_servico,
        bumps: a.bumps ?? [],
      }));

    setServicos(servicosRealizados);
    setProdutos((prodData as Produto[]) ?? []);
    setFinanc(financData);

    setLoading(false);
  }, [usuario?.profissional_id, dateRange]);

  useEffect(() => {
    if (usuario?.profissional_id) fetchData();
  }, [fetchData, usuario?.profissional_id]);

  // KPIs — totais derivados da fonte de verdade única (financeService)
  const totalServicos = financ?.receitaServicos ?? 0;
  const totalBumps = financ?.receitaBumps ?? 0;

  const qtdServicosConcluidos = financ?.concluidos ?? 0;
  const qtdBumpsVendidos = servicos.reduce((sum, s) => sum + s.bumps.length, 0);

  // Montar lista de produtos vendidos (agrupada por produto)
  const produtosVendidos = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; qtd: number; total: number }>();
    servicos.forEach((s) => {
      s.bumps.forEach((b) => {
        const nome =
          produtos.find((p) => p.id === b.produto_id)?.nome ?? 'Produto (Order Bump)';
        const cur = map.get(b.produto_id ?? b.id) ?? {
          id: b.produto_id ?? b.id,
          nome,
          qtd: 0,
          total: 0,
        };
        cur.qtd += 1;
        cur.total += b.valor_pago;
        map.set(cur.id, cur);
      });
    });
    return Array.from(map.values()).sort((x, y) => y.total - x.total);
  }, [servicos, produtos]);

  const stats = [
    { label: 'Serviços Realizados', value: qtdServicosConcluidos.toString(), icon: Scissors, color: 'text-highlight', bg: 'bg-highlight/10' },
    { label: 'Vendas em Serviços', value: formatCurrency(totalServicos), icon: TrendingUp, color: 'text-[#4FE7FF]', bg: 'bg-[#4FE7FF]/10' },
    { label: 'Produtos Vendidos', value: qtdBumpsVendidos.toString(), icon: Tag, color: 'text-[#81FF4D]', bg: 'bg-[#81FF4D]/10' },
    { label: 'Total em Order Bump', value: formatCurrency(totalBumps), icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#F5F1EA] tracking-wide mb-1">
            Minhas Comissões
          </h1>
          <p className="text-cream/50 text-sm capitalize">
            Visão financeira restrita aos seus atendimentos
            {usuario?.profissional?.name ? ` — ${usuario.profissional.name}` : ''}
          </p>
        </div>
        <PeriodFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {loading ? (
        <div className="p-16 text-center text-cream/40 text-sm animate-pulse">
          Carregando suas comissões...
        </div>
      ) : (
        <>
          {/* Resumo de comissão (estimativa) */}
          <Card className="border-white/10 bg-[#121212]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide mb-1">
                  Resumo do Período
                </h3>
                <p className="text-xs text-cream/40">
                  Base para cálculo de comissões do profissional
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left sm:text-center md:text-right">
                <div>
                  <p className="text-xl sm:text-2xl font-display text-[#4FE7FF] break-words">
                    {formatCurrency(totalServicos)}
                  </p>
                  <p className="text-[11px] text-cream/40">Serviços</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-display text-[#81FF4D] break-words">
                    {formatCurrency(totalBumps)}
                  </p>
                  <p className="text-[11px] text-cream/40">Bumps</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-display text-highlight break-words">
                    {formatCurrency(totalServicos + totalBumps)}
                  </p>
                  <p className="text-[11px] text-cream/40">Total</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Serviços realizados */}
            <Card className="border-white/10 bg-[#121212]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
                  Atendimentos Realizados
                </h3>
                <span className="text-xs text-cream/40 flex items-center gap-1.5">
                  <CalendarDays size={13} /> {servicos.length}
                </span>
              </div>

              {servicos.length === 0 ? (
                <div className="py-10 text-center text-cream/30">
                  <Receipt size={34} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-[#F5F1EA] font-medium mb-1">
                    Nenhum atendimento no período
                  </p>
                  <p className="text-xs text-cream/40">
                    Os atendimentos concluídos aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {servicos.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#F5F1EA] font-medium truncate">
                          {s.servicoNome}
                        </p>
                        <p className="text-[11px] text-cream/50 truncate">
                          {s.clienteNome} • {formatDateTime(s.dataInicio)}
                        </p>
                        {s.bumps.length > 0 && (
                          <p className="text-[11px] text-[#81FF4D] mt-0.5">
                            +{s.bumps.length} {s.bumps.length === 1 ? 'bump' : 'bumps'}{' '}
                            ({formatCurrency(s.bumps.reduce((sum, b) => sum + b.valor_pago, 0))})
                          </p>
                        )}
                      </div>
                      <span className="font-display text-lg text-highlight shrink-0">
                        {formatCurrency(s.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Produtos vendidos */}
            <Card className="border-white/10 bg-[#121212]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide">
                  Produtos Vendidos (Order Bump)
                </h3>
                <span className="text-xs text-cream/40">
                  {produtosVendidos.length} {produtosVendidos.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>

              {produtosVendidos.length === 0 ? (
                <div className="py-10 text-center text-cream/30">
                  <Tag size={34} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-[#F5F1EA] font-medium mb-1">
                    Nenhum produto vendido
                  </p>
                  <p className="text-xs text-cream/40">
                    Produtos adicionados nos seus atendimentos aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {produtosVendidos.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#F5F1EA] font-medium truncate">{p.nome}</p>
                        <p className="text-[11px] text-cream/50">
                          {p.qtd} {p.qtd === 1 ? 'venda' : 'vendas'}
                        </p>
                      </div>
                      <span className="font-display text-lg text-[#81FF4D] shrink-0">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
