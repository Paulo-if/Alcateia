import { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { realizarInventarioEstoque, listarMovimentacoesFull } from '@/lib/estoqueService';
import type { EstoqueMovimentacaoFull } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EstoquePanelProps, inputClass, fmtDataHora } from './estoqueUi';
import { cn } from '@/lib/utils';

export function EstoqueInventario({ produtos, refresh, initialProdutoId }: EstoquePanelProps) {
  const [produtoId, setProdutoId] = useState('');
  const [qtdFisica, setQtdFisica] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [ajustes, setAjustes] = useState<EstoqueMovimentacaoFull[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (initialProdutoId && produtos.some((p) => p.id === initialProdutoId)) {
      setProdutoId(initialProdutoId);
    }
  }, [initialProdutoId, produtos]);

  useEffect(() => {
    (async () => {
      setLoadingHist(true);
      const movs = await listarMovimentacoesFull({ origem: 'ajuste', limite: 15 });
      setAjustes(movs);
      setLoadingHist(false);
    })();
  }, []);

  const sel = produtos.find((p) => p.id === produtoId);

  const handleSubmit = async () => {
    setError(null);
    setSucesso(null);
    if (!produtoId) return setError('Selecione um produto.');
    const qtd = parseInt(qtdFisica, 10);
    if (!Number.isInteger(qtd) || qtd < 0) return setError('Informe a quantidade física (0 ou mais).');
    if (!motivo.trim()) return setError('O motivo do inventário é obrigatório.');

    setBusy(true);
    const { movimentacao, error: err } = await realizarInventarioEstoque({
      produto_id: produtoId,
      quantidade_fisica: qtd,
      motivo: motivo.trim(),
      observacao,
    });
    setBusy(false);

    if (err) return setError(err);
    if (!movimentacao) {
      setSucesso(`Sem divergência: o estoque de ${sel?.nome ?? 'produto'} já corresponde a ${qtd} un.`);
    } else {
      setSucesso(
        `Divergência corrigida: ajuste de ${movimentacao.tipo === 'entrada' ? '+' : '−'}${movimentacao.quantidade} em ${sel?.nome ?? 'produto'}.`,
      );
    }
    setQtdFisica('');
    setMotivo('');
    setObservacao('');
    const movs = await listarMovimentacoesFull({ origem: 'ajuste', limite: 15 });
    setAjustes(movs);
    refresh();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-1 flex items-center gap-2">
          <ClipboardList size={18} className="text-violet-400" /> Contagem (inventário)
        </h3>
        <p className="text-xs text-cream/40 mb-5">Conte o estoque físico; o saldo é ajustado quando houver divergência</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Produto *</label>
            <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className={inputClass()}>
              <option value="">Selecione um produto...</option>
              {[...produtos]
                .sort((a, b) => (b.estoque_atual ?? 0) - (a.estoque_atual ?? 0))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (sistema: {p.estoque_atual ?? 0} {p.unidade_medida ?? 'un'})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Quantidade física *</label>
            <input
              type="number"
              min="0"
              value={qtdFisica}
              onChange={(e) => setQtdFisica(e.target.value)}
              placeholder="0"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Motivo do inventário *</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: contagem mensal / recebimento"
              className={inputClass()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Observação</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes adicionais..."
              className={inputClass()}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#81FF4D]/10 border border-[#81FF4D]/30 text-[#a3ff7a] text-xs">
              <CheckCircle2 size={14} className="shrink-0" /> {sucesso}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-violet-500 text-white font-semibold hover:bg-violet-400"
          >
            {busy ? 'Contando...' : 'Conferir Estoque'}
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-3 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-2">Últimos ajustes</h3>
        <p className="text-xs text-cream/40 mb-4">Registros de divergência no inventário</p>

        {loadingHist ? (
          <div className="p-10 text-center text-cream/40 text-sm animate-pulse">Carregando ajustes...</div>
        ) : ajustes.length === 0 ? (
          <div className="p-10 text-center text-cream/40 text-sm">
            Nenhum ajuste de inventário registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {ajustes.map((m) => (
              <div
                key={m.id}
                className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-cream truncate">
                    {m.produto?.nome ?? 'Produto'}
                    {m.estornado && <span className="ml-2 text-[10px] uppercase text-cream/40">(estornado)</span>}
                  </p>
                  <p className="text-[11px] text-cream/40 truncate">
                    {fmtDataHora(m.data_movimentacao ?? m.created_at)} · {m.motivo || '—'} · {m.observacao || 'Sem observação'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    'font-mono font-semibold text-sm',
                    m.tipo === 'entrada' ? 'text-[#81FF4D]' : 'text-red-400',
                  )}>
                    {m.tipo === 'entrada' ? '+' : '−'}{m.quantidade}
                  </p>
                  <p className="text-[10px] text-cream/40 font-mono">{m.estoque_anterior} → {m.estoque_posterior}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}