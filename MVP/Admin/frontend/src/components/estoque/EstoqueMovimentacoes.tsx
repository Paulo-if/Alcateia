import { useCallback, useEffect, useState } from 'react';
import { History, PackagePlus, PackageMinus, FilterX } from 'lucide-react';
import { listarMovimentacoesComResponsavel } from '@/lib/estoqueService';
import type { EstoqueMovimentacaoFull, EstoqueMovimentacaoOrigem, EstoqueMovimentacaoTipo } from '@/types';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import {
  EstoquePanelProps,
  inputClass,
  origemLabel,
  origemDotColor,
  fmtDataHora,
} from './estoqueUi';
import { cn } from '@/lib/utils';

const ORIGENS: EstoqueMovimentacaoOrigem[] = [
  'manual',
  'venda',
  'order_bump',
  'ajuste',
  'consumo',
  'perda',
  'servico',
];

const PAGE_SIZE = 12;

export function EstoqueMovimentacoes({ produtos, fornecedores }: EstoquePanelProps) {
  const [movs, setMovs] = useState<EstoqueMovimentacaoFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [fProduto, setFProduto] = useState('');
  const [fTipo, setFTipo] = useState<EstoqueMovimentacaoTipo | ''>('');
  const [fOrigem, setFOrigem] = useState<EstoqueMovimentacaoOrigem | ''>('');
  const [fFornecedor, setFFornecedor] = useState('');
  const [fInicio, setFInicio] = useState('');
  const [fFim, setFFim] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const movs = await listarMovimentacoesComResponsavel({
      produto_id: fProduto || undefined,
      tipo: fTipo || undefined,
      origem: fOrigem || undefined,
      fornecedor_id: fFornecedor || undefined,
      inicio: fInicio ? new Date(`${fInicio}T00:00:00`).toISOString() : undefined,
      fim: fFim ? new Date(`${fFim}T23:59:59`).toISOString() : undefined,
      limite: 300,
    });
    setMovs(movs);
    setPage(1);
    setLoading(false);
  }, [fProduto, fTipo, fOrigem, fFornecedor, fInicio, fFim]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilter = fProduto || fTipo || fOrigem || fFornecedor || fInicio || fFim;

  const pageCount = Math.max(1, Math.ceil(movs.length / PAGE_SIZE));
  const pageItems = movs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="border-white/10 bg-[#121212]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg text-[#F5F1EA] flex items-center gap-2">
            <History size={18} className="text-highlight" /> Movimentações de estoque
          </h3>
          <p className="text-xs text-cream/40">Histórico completo com responsável, cliente e origem</p>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setFProduto('');
              setFTipo('');
              setFOrigem('');
              setFFornecedor('');
              setFInicio('');
              setFFim('');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-highlight hover:underline font-medium"
          >
            <FilterX size={14} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-5">
        <select value={fProduto} onChange={(e) => setFProduto(e.target.value)} className={cn(inputClass(), 'col-span-2 md:col-span-3 xl:col-span-2')}>
          <option value="">Todos os produtos</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value as EstoqueMovimentacaoTipo | '')} className={inputClass()}>
          <option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <select value={fOrigem} onChange={(e) => setFOrigem(e.target.value as EstoqueMovimentacaoOrigem | '')} className={inputClass()}>
          <option value="">Todas as origens</option>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>{origemLabel[o]}</option>
          ))}
        </select>
        <select value={fFornecedor} onChange={(e) => setFFornecedor(e.target.value)} className={inputClass()}>
          <option value="">Todos os fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
        <input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} className={cn(inputClass(), 'text-cream')} aria-label="Data inicial" />
        <input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} className={cn(inputClass(), 'text-cream')} aria-label="Data final" />
      </div>

      {loading ? (
        <div className="p-10 text-center text-cream/40 text-sm animate-pulse">Carregando movimentações...</div>
      ) : pageItems.length === 0 ? (
        <div className="p-10 text-center text-cream/40 text-sm">
          Nenhuma movimentação encontrada para esses filtros.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {pageItems.map((m) => {
              const isIn = m.tipo === 'entrada';
              return (
                <div key={m.id} className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        isIn ? 'bg-[#81FF4D]/10 text-[#81FF4D]' : 'bg-red-500/10 text-red-400',
                      )}
                    >
                      {isIn ? <PackagePlus size={16} /> : <PackageMinus size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-cream truncate">
                        {m.produto?.nome ?? 'Produto'}
                        {m.estornado && (
                          <span className="ml-2 text-[10px] uppercase text-cream/40">(estornado)</span>
                        )}
                      </p>
                      <p className="text-[11px] text-cream/40 flex items-center gap-1.5 truncate">
                        <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', origemDotColor[m.origem])} />
                        {origemLabel[m.origem]} · {fmtDataHora(m.data_movimentacao ?? m.created_at)}
                      </p>
                      <p className="text-[11px] text-cream/40 truncate">
                        {m.motivo ? `Motivo: ${m.motivo} · ` : ''}
                        {m.cliente?.nome ? `Cliente: ${m.cliente.nome} · ` : ''}
                        {m.fornecedor?.nome ? `Fornecedor: ${m.fornecedor.nome} · ` : ''}
                        {m.responsavel?.nome ? `Por: ${m.responsavel.nome} · ` : ''}
                        {m.observacao || 'Sem observação'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={cn('font-mono font-semibold text-sm', isIn ? 'text-[#81FF4D]' : 'text-red-400')}>
                        {isIn ? '+' : '−'}{m.quantidade}
                        {m.valor_unitario !== null && m.valor_unitario !== undefined && (
                          <span className="ml-1 text-[10px] text-cream/40 font-normal">
                            R$ {Number(m.valor_unitario).toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-cream/40 font-mono">
                        {m.estoque_anterior} → {m.estoque_posterior}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={movs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}