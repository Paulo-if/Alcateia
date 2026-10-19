import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  Wallet,
  AlertTriangle,
  PackageX,
  CalendarClock,
  CalendarX2,
  TrendingDown,
  TrendingUp,
  PackagePlus,
  PackageMinus,
  RefreshCw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  fetchEstoqueKpis,
  fetchRankingVendas,
  listarMovimentacoesFull,
} from '@/lib/estoqueService';
import type { EstoqueKpis, RankingItem, EstoqueMovimentacaoFull, Produto } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  EstoquePanelProps,
  situacaoEstoque,
  validadeInfo,
  fmtMoeda,
  fmtDataHora,
  origemLabel,
  origemDotColor,
} from './estoqueUi';
import { cn } from '@/lib/utils';
import { EstoqueProdutoCard } from './EstoqueProdutoCard';

type StatTone = 'neutral' | 'ok' | 'warn' | 'danger';

const cardTone: Record<StatTone, string> = {
  neutral: 'border-white/10',
  ok: 'border-[#81FF4D]/25',
  warn: 'border-[#FFD166]/30',
  danger: 'border-red-500/30',
};

const iconTone: Record<StatTone, string> = {
  neutral: 'bg-highlight/10 text-highlight',
  ok: 'bg-[#81FF4D]/15 text-[#81FF4D]',
  warn: 'bg-[#FFD166]/15 text-[#FFD166]',
  danger: 'bg-red-500/15 text-red-400',
};

const valueTone: Record<StatTone, string> = {
  neutral: 'text-[#F5F1EA]',
  ok: 'text-[#81FF4D]',
  warn: 'text-[#FFD166]',
  danger: 'text-red-300',
};

export function EstoquePainel({
  produtos,
  fornecedores,
  refresh,
  onOpenProduto,
  onToggleAtivo,
  onRegistrarEntrada,
  onRegistrarSaida,
}: EstoquePanelProps) {
  const [kpis, setKpis] = useState<EstoqueKpis | null>(null);
  const [maisVendidos, setMaisVendidos] = useState<RankingItem[]>([]);
  const [menosVendidos, setMenosVendidos] = useState<RankingItem[]>([]);
  const [recentes, setRecentes] = useState<EstoqueMovimentacaoFull[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [podeAnterior, setPodeAnterior] = useState(false);
  const [podeProximo, setPodeProximo] = useState(false);

  const load = useCallback(async () => {
    const [k, v, m] = await Promise.all([
      fetchEstoqueKpis(),
      fetchRankingVendas(30),
      listarMovimentacoesFull({ limite: 6 }),
    ]);
    setKpis(k);
    const vendas = v.sort((a, b) => b.total - a.total);
    setMaisVendidos(vendas.slice(0, 5));
    setMenosVendidos([...vendas].sort((a, b) => a.total - b.total).slice(0, 5));
    setRecentes(m);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const esgotados = produtos.filter((p) => situacaoEstoque(p) === 'esgotado' && p.ativo);
  const baixo = produtos.filter((p) => situacaoEstoque(p) === 'baixo' && p.ativo);
  const vencendo = produtos.filter((p) => validadeInfo(p).status === 'vencendo');
  const vencidos = produtos.filter((p) => validadeInfo(p).status === 'vencido');

  const atencao = useMemo(() => {
    const unicos = new Map<string, Produto>();
    for (const p of [...esgotados, ...vencidos, ...baixo, ...vencendo]) {
      if (!unicos.has(p.id)) unicos.set(p.id, p);
    }
    return [...unicos.values()];
  }, [esgotados, baixo, vencendo, vencidos]);

  const atualizarScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPodeAnterior(el.scrollLeft > 4);
    setPodeProximo(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(atualizarScroll);
    window.addEventListener('resize', atualizarScroll);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', atualizarScroll);
    };
  }, [atualizarScroll, atencao]);

  const rolar = (direcao: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * direcao, behavior: 'smooth' });
  };

  const totalAlertas = atencao.length;

  const stats = [
    {
      key: 'unidades',
      label: 'Unidades em estoque',
      value: kpis ? String(kpis.total_unidades) : '—',
      numero: kpis ? kpis.total_unidades : null,
      icon: Boxes,
      tone: 'neutral' as StatTone,
    },
    {
      key: 'valor',
      label: 'Valor do estoque (custo)',
      value: kpis ? fmtMoeda(kpis.valor_total_estoque) : '—',
      numero: null,
      icon: Wallet,
      tone: 'neutral' as StatTone,
    },
    {
      key: 'baixo',
      label: 'Estoque baixo',
      value: kpis ? String(kpis.skus_baixo) : '—',
      numero: kpis ? kpis.skus_baixo : null,
      icon: AlertTriangle,
      tone: 'warn' as StatTone,
    },
    {
      key: 'esgotados',
      label: 'Esgotados',
      value: kpis ? String(kpis.skus_esgotados) : '—',
      numero: kpis ? kpis.skus_esgotados : null,
      icon: PackageX,
      tone: 'danger' as StatTone,
    },
    {
      key: 'vencendo',
      label: 'Vencendo (30 dias)',
      value: kpis ? String(kpis.skus_vencendo) : '—',
      numero: kpis ? kpis.skus_vencendo : null,
      icon: CalendarClock,
      tone: 'warn' as StatTone,
    },
    {
      key: 'vencidos',
      label: 'Vencidos',
      value: kpis ? String(kpis.skus_vencidos) : '—',
      numero: kpis ? kpis.skus_vencidos : null,
      icon: CalendarX2,
      tone: 'danger' as StatTone,
    },
  ];

  const performance = (tone: StatTone, numero: number | null): StatTone => {
    if (tone === 'neutral') return 'neutral';
    if (numero === null || numero === undefined) return 'neutral';
    return numero > 0 ? tone : 'ok';
  };

  const recenteIcon = (tipo: string) =>
    tipo === 'entrada' ? (
      <PackagePlus size={15} className="text-[#81FF4D]" />
    ) : (
      <PackageMinus size={15} className="text-red-400" />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cream/40 font-semibold">
            Visão geral
          </p>
          <p className="text-xs text-cream/50 mt-0.5">
            {kpis ? `${kpis.total_produtos} produtos no catálogo` : 'Carregando indicadores...'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={14} />
          Atualizar dados
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => {
          const t = performance(s.tone, s.numero);
          const IconComp = t === 'ok' ? CheckCircle2 : s.icon;
          return (
            <Card
              key={s.key}
              className={cn('animate-fade-in-up bg-[#121212] !p-4', cardTone[t])}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', iconTone[t])}>
                <IconComp size={18} />
              </div>
              <div className={cn('font-display text-lg sm:text-xl leading-tight truncate', valueTone[t])}>
                {s.value}
              </div>
              <div className="text-[11px] text-cream/50 mt-0.5">{s.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Alertas */}
      {totalAlertas > 0 ? (
        <Card className="bg-[#121212] border-white/10">
          <div className="flex items-center gap-2 mb-1 font-display text-lg text-[#F5F1EA]">
            <AlertTriangle size={17} className="text-[#FFD166]" />
            Atenção no estoque
          </div>
          <p className="text-xs text-cream/40 mb-4">
            {totalAlertas} produto{totalAlertas === 1 ? '' : 's'} precisa{totalAlertas === 1 ? '' : 'm'} de
            reposição ou validação de validade
          </p>
          <div className="flex items-stretch gap-3">
            <div
              ref={scrollRef}
              onScroll={atualizarScroll}
              className="flex-1 min-w-0 flex gap-4 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            >
              {atencao.map((p) => (
                <div
                  key={p.id}
                  className="flex-none w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]"
                >
                  <EstoqueProdutoCard
                    produto={p}
                    fornecedor={fornecedores.find((f) => f.id === p.fornecedor_id)}
                    onOpen={onOpenProduto}
                    onToggleAtivo={onToggleAtivo}
                    onRegistrarEntrada={onRegistrarEntrada}
                    onRegistrarSaida={onRegistrarSaida}
                  />
                </div>
              ))}
            </div>
            {atencao.length > 5 && (
              <div className="flex flex-col justify-center gap-2 shrink-0">
                {podeAnterior && (
                  <button
                    type="button"
                    aria-label="Voltar produtos"
                    onClick={() => rolar(-1)}
                    className="w-11 h-11 rounded-xl border border-white/10 bg-[#0f0f0f] text-cream/70 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                {podeProximo && (
                  <button
                    type="button"
                    aria-label="Avançar produtos"
                    onClick={() => rolar(1)}
                    className="w-11 h-11 rounded-xl border border-white/10 bg-[#0f0f0f] text-cream/70 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="bg-[#121212] border-[#81FF4D]/25">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#81FF4D]/10 flex items-center justify-center text-[#81FF4D] shrink-0">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F5F1EA]">Estoque saudável</p>
              <p className="text-xs text-cream/40">
                Nenhum produto esgotado, em estoque baixo ou próximo do vencimento.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mais vendidos */}
        <Card className="bg-[#121212] border-white/10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 font-display text-lg text-[#F5F1EA]">
              <TrendingUp size={16} className="text-[#81FF4D]" /> Mais vendidos
            </div>
            <Badge variant="default">30 dias</Badge>
          </div>
          <p className="text-xs text-cream/40 mb-4">Saídas de venda e order bump</p>
          {maisVendidos.length === 0 ? (
            <div className="py-8 text-center text-cream/30 text-xs">
              Sem vendas com estoque no período.
            </div>
          ) : (
            <div className="space-y-2">
              {maisVendidos.map((r, i) => (
                <div
                  key={r.produto_id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2"
                >
                  <span className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center font-mono text-[11px] text-cream/50 shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs text-cream/85 truncate">{r.produto_nome}</span>
                  <span className="font-mono text-xs font-semibold text-[#81FF4D]">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Menos vendidos */}
        <Card className="bg-[#121212] border-white/10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 font-display text-lg text-[#F5F1EA]">
              <TrendingDown size={16} className="text-[#FFD166]" /> Menos vendidos
            </div>
            <Badge variant="default">30 dias</Badge>
          </div>
          <p className="text-xs text-cream/40 mb-4">Menores volumes no período</p>
          {menosVendidos.length === 0 ? (
            <div className="py-8 text-center text-cream/30 text-xs">
              Sem vendas com estoque no período.
            </div>
          ) : (
            <div className="space-y-2">
              {menosVendidos.map((r, i) => (
                <div
                  key={r.produto_id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2"
                >
                  <span className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center font-mono text-[11px] text-cream/50 shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs text-cream/85 truncate">{r.produto_nome}</span>
                  <span className="font-mono text-xs font-semibold text-[#FFD166]">{r.total}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Movimentações recentes */}
        <Card className="bg-[#121212] border-white/10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2 font-display text-lg text-[#F5F1EA]">
              <PackagePlus size={16} className="text-highlight" /> Movimentações recentes
            </div>
            <button
              type="button"
              onClick={refresh}
              className="text-[11px] font-semibold text-highlight hover:text-highlight/80 transition-colors shrink-0"
            >
              Ver em Movimentações →
            </button>
          </div>
          <p className="text-xs text-cream/40 mb-4">Últimas entradas e saídas</p>
          {recentes.length === 0 ? (
            <div className="py-8 text-center text-cream/30 text-xs">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="space-y-2">
              {recentes.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2.5"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      m.tipo === 'entrada' ? 'bg-[#81FF4D]/10' : 'bg-red-500/10',
                    )}
                  >
                    {recenteIcon(m.tipo)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-cream truncate">
                      {m.produto?.nome ?? 'Produto'}
                      <span className="ml-2 font-mono text-[10px] text-cream/40">
                        {m.tipo === 'entrada' ? '+' : '−'}
                        {m.quantidade}
                      </span>
                    </p>
                    <p className="text-[10px] text-cream/40 flex items-center gap-1.5 truncate">
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', origemDotColor[m.origem])} />
                      {origemLabel[m.origem]} · {fmtDataHora(m.data_movimentacao ?? m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}