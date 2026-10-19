import { useCallback, useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { BarChart3, PackageX, Scissors, ThumbsDown, ShoppingCart, TrendingUp } from 'lucide-react';
import {
  fetchRelCompras,
  fetchRelPerdas,
  fetchRelCustoServicos,
  fetchProdutosParados,
} from '@/lib/estoqueService';
import type { CompraReportItem, PerdaReportItem, CustoServicoItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PeriodFilter, type DateRange } from '@/components/ui/PeriodFilter';
import { EstoquePanelProps, fmtMoeda, fmtDataHora } from './estoqueUi';
import { getStartOfMonth, getEndOfMonth, cn } from '@/lib/utils';

type ReportTab = 'compras' | 'perdas' | 'custo' | 'parados';

const tabs: { key: ReportTab; label: string; icon: ElementType }[] = [
  { key: 'compras', label: 'Compras', icon: ShoppingCart },
  { key: 'perdas', label: 'Perdas', icon: PackageX },
  { key: 'custo', label: 'Custo por Serviço', icon: Scissors },
  { key: 'parados', label: 'Produtos Parados', icon: ThumbsDown },
];

export function EstoqueRelatorios(props: EstoquePanelProps) {
  void props;
  const [tab, setTab] = useState<ReportTab>('compras');

  const [compras, setCompras] = useState<CompraReportItem[]>([]);
  const [perdas, setPerdas] = useState<PerdaReportItem[]>([]);
  const [custos, setCustos] = useState<CustoServicoItem[]>([]);
  const [parados, setParados] = useState<{ id: string; nome: string; ativo: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const [periodo, setPeriodo] = useState<DateRange>(() => {
    const now = new Date();
    return {
      preset: 'month',
      startDate: getStartOfMonth(now),
      endDate: getEndOfMonth(now),
    };
  });

  const load = useCallback(async () => {
    setLoading(true);
    const ini = new Date(periodo.startDate);
    const fim = new Date(periodo.endDate);
    const pInicio = `${ini.getFullYear()}-${(ini.getMonth() + 1).toString().padStart(2, '0')}-${ini.getDate()}`;
    const pFim = `${fim.getFullYear()}-${(fim.getMonth() + 1).toString().padStart(2, '0')}-${fim.getDate()}`;
    const [c, pe, cs, pa] = await Promise.all([
      fetchRelCompras(pInicio, pFim),
      fetchRelPerdas(pInicio, pFim),
      fetchRelCustoServicos(),
      fetchProdutosParados(30),
    ]);
    setCompras(c);
    setPerdas(pe);
    setCustos(cs);
    setParados(pa);
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCompras = compras.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  const totalPerdas = perdas.reduce((acc, r) => acc + (Number(r.valor_total) || 0), 0);
  const totalCusto = custos.reduce((acc, r) => acc + (Number(r.custo_total) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex gap-1.5 bg-black/40 border border-white/5 rounded-xl p-1.5 self-start overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border',
                tab === t.key
                  ? 'bg-white/[0.09] text-white border-white/15 shadow-sm'
                  : 'bg-transparent text-cream/40 border-transparent hover:text-white hover:bg-white/[0.05]',
              )}
            >
              <t.icon size={13} className={tab === t.key ? 'text-highlight' : 'text-cream/30'} /> {t.label}
            </button>
          ))}
        </div>
        {tab !== 'custo' && tab !== 'parados' && (
          <PeriodFilter value={periodo} onChange={setPeriodo} />
        )}
        {tab === 'parados' && (
          <Button variant="secondary" size="sm" onClick={load}>
            <TrendingUp size={14} /> Atualizar (30 dias)
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-cream/40 text-sm animate-pulse">Gerando relatório...</div>
      ) : tab === 'compras' ? (
        <Card className="border-white/10 bg-[#121212]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2">
                <BarChart3 size={17} className="text-highlight" /> Compras do período
              </h3>
              <p className="text-xs text-cream/40">Entradas com fornecedor, nota fiscal e custo</p>
            </div>
            <span className="font-display text-xl text-highlight">{fmtMoeda(totalCompras)}</span>
          </div>
          {compras.length === 0 ? (
            <div className="p-10 text-center text-cream/40 text-sm">Nenhuma compra no período.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {compras.map((r, i) => (
                <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <p className="text-[11px] text-cream/40 font-mono shrink-0">{fmtDataHora(r.data_movimentacao)}</p>
                  <p className="text-xs text-cream/80 font-medium flex-1 truncate">{r.produto_nome}</p>
                  <div className="flex items-center gap-4 text-[11px] text-cream/50 shrink-0">
                    <span>Qtd: <b className="text-cream/80">{r.quantidade}</b></span>
                    <span>un {fmtMoeda(r.valor_unitario)}</span>
                    <span className="font-mono text-highlight font-semibold">{fmtMoeda(r.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : tab === 'perdas' ? (
        <Card className="border-white/10 bg-[#121212]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2">
                <PackageX size={17} className="text-red-400" /> Perdas do período
              </h3>
              <p className="text-xs text-cream/40">Perda/avaria avaliada pelo custo unitário</p>
            </div>
            <span className="font-display text-xl text-red-400">{fmtMoeda(totalPerdas)}</span>
          </div>
          {perdas.length === 0 ? (
            <div className="p-10 text-center text-cream/40 text-sm">Nenhuma perda registrada no período.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {perdas.map((r, i) => (
                <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <p className="text-[11px] text-cream/40 font-mono shrink-0">{fmtDataHora(r.data_movimentacao)}</p>
                  <p className="text-xs text-cream/80 font-medium flex-1 truncate">{r.produto_nome} {r.motivo ? `(${r.motivo})` : ''}</p>
                  <div className="flex items-center gap-4 text-[11px] text-cream/50 shrink-0">
                    <span>Qtd: <b className="text-cream/80">{r.quantidade}</b></span>
                    <span>custo {fmtMoeda(r.custo_unitario)}</span>
                    <span className="font-mono text-red-400 font-semibold">{fmtMoeda(r.valor_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : tab === 'custo' ? (
        <Card className="border-white/10 bg-[#121212]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2">
                <Scissors size={17} className="text-highlight" /> Custo estimado por serviço
              </h3>
              <p className="text-xs text-cream/40">Soma dos produtos vinculados (quantidade × custo da compra)</p>
            </div>
            <span className="font-display text-xl text-highlight">{fmtMoeda(totalCusto)}</span>
          </div>
          {custos.length === 0 ? (
            <div className="p-10 text-center text-cream/40 text-sm">
              Nenhum serviço com produtos vinculados. Vincule produtos na aba Serviços.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {custos.map((r, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-cream/80 font-medium">{r.servico_nome}</p>
                  <span className="font-mono text-xs text-highlight font-semibold shrink-0">{fmtMoeda(r.custo_total)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-cream/30 mt-3">Produto sem custo cadastrado não entra no cálculo.</p>
        </Card>
      ) : (
        <Card className="border-white/10 bg-[#121212]">
          <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2 mb-1">
            <ThumbsDown size={17} className="text-[#FFD166]" /> Produtos parados
          </h3>
          <p className="text-xs text-cream/40 mb-4">Sem venda em estoque, venda ou order bump nos últimos 30 dias</p>
          {parados.length === 0 ? (
            <div className="p-10 text-center text-cream/40 text-sm">Nenhum produto parado no período.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {parados.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-cream/80 font-medium">{p.nome}</p>
                  <span className={cn(
                    'text-[10px] uppercase px-2 py-0.5 rounded-md border font-bold',
                    p.ativo ? 'text-[#81FF4D] border-[#81FF4D]/30 bg-[#81FF4D]/10' : 'text-red-400 border-red-500/30 bg-red-500/10',
                  )}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}