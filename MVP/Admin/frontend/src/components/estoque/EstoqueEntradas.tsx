import { useEffect, useState } from 'react';
import { PackagePlus, AlertTriangle, Boxes } from 'lucide-react';
import { registrarEntradaEstoque, listarMovimentacoesFull } from '@/lib/estoqueService';
import type { EstoqueMovimentacaoFull } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { EstoquePanelProps, inputClass, fmtDataHora, filtrarPorNome } from './estoqueUi';
import { cn } from '@/lib/utils';

export function EstoqueEntradas({ produtos, fornecedores, refresh, initialProdutoId }: EstoquePanelProps) {
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [dataMov, setDataMov] = useState('');
  const [observacao, setObservacao] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [recentes, setRecentes] = useState<EstoqueMovimentacaoFull[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  useEffect(() => {
    if (initialProdutoId && produtos.some((p) => p.id === initialProdutoId)) {
      setProdutoId(initialProdutoId);
    }
  }, [initialProdutoId, produtos]);

  useEffect(() => {
    (async () => {
      setLoadingHist(true);
      const movs = await listarMovimentacoesFull({ tipo: 'entrada', limite: 12 });
      setRecentes(movs);
      setLoadingHist(false);
    })();
  }, []);

  const sel = produtos.find((p) => p.id === produtoId);

  const handleSubmit = async () => {
    setError(null);
    setSucesso(null);
    const qty = parseInt(quantidade, 10);
    if (!produtoId) return setError('Selecione um produto.');
    if (!Number.isInteger(qty) || qty < 1) return setError('Informe uma quantidade válida (mínimo 1).');

    let valor: number | null = null;
    if (valorUnitario.trim()) {
      const v = parseFloat(valorUnitario.replace(',', '.'));
      if (Number.isNaN(v) || v < 0) return setError('Informe um custo unitário válido ou deixe em branco.');
      valor = v;
    }

    setBusy(true);
    const { error: err } = await registrarEntradaEstoque({
      produto_id: produtoId,
      quantidade: qty,
      valor_unitario: valor,
      fornecedor_id: fornecedorId || null,
      nota_fiscal: notaFiscal,
      data_movimentacao: dataMov ? new Date(dataMov).toISOString() : null,
      observacao,
    });
    setBusy(false);

    if (err) return setError(err);
    setSucesso(`Entrada de ${qty} un. registrada em ${sel?.nome ?? 'produto'}.`);
    setQuantidade('');
    setValorUnitario('');
    setNotaFiscal('');
    setDataMov('');
    setObservacao('');
    const movs = await listarMovimentacoesFull({ tipo: 'entrada', limite: 12 });
    setRecentes(movs);
    refresh();
  };

  const filtradas = filtrarPorNome(search, produtos.filter((p) => p.ativo || p.id === produtoId));

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Formulário */}
      <Card className="lg:col-span-2 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-1 flex items-center gap-2">
          <PackagePlus size={18} className="text-[#81FF4D]" /> Nova entrada
        </h3>
        <p className="text-xs text-cream/40 mb-5">Compra de fornecedor ou reposição de estoque</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Produto *</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className={inputClass()}
            >
              <option value="">Selecione um produto...</option>
              {filtradas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (saldo: {p.estoque_atual ?? 0} {p.unidade_medida ?? 'un'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">Quantidade *</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="1"
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">
                Custo unitário (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="0.00"
                className={inputClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Fornecedor</label>
            <select
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
              className={inputClass()}
            >
              <option value="">Sem fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">Nota fiscal</label>
              <input
                type="text"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                placeholder="NF-0001"
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-cream/60 mb-1.5">Data</label>
              <input
                type="datetime-local"
                value={dataMov}
                onChange={(e) => setDataMov(e.target.value)}
                className={inputClass()}
              />
              <p className="text-[10px] text-cream/40 mt-1">Em branco usa a data atual</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Observação</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: reposição semanal"
              className={inputClass()}
            />
          </div>

          {sel && (
            <div className="rounded-xl bg-black/30 border border-white/5 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-cream/50 flex items-center gap-1.5">
                <Boxes size={13} className="text-[#81FF4D]" /> Saldo atual
              </span>
              <span className="font-mono font-semibold text-cream">
                {sel.estoque_atual ?? 0} {sel.unidade_medida ?? 'un'}
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
              <AlertTriangle size={14} className="shrink-0" /> {error}
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#81FF4D]/10 border border-[#81FF4D]/30 text-[#a3ff7a] text-xs">
              <PackagePlus size={14} className="shrink-0" /> {sucesso}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-[#81FF4D] text-black font-semibold hover:bg-[#a3ff7a]"
          >
            {busy ? 'Registrando...' : 'Confirmar Entrada'}
          </Button>
        </div>
      </Card>

      {/* Lista de entradas recentes */}
      <Card className="lg:col-span-3 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-2">Entradas recentes</h3>
        <div className="mb-4 max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Filtrar por produto..." />
        </div>

        {loadingHist ? (
          <div className="p-10 text-center text-cream/40 text-sm animate-pulse">Carregando entradas...</div>
        ) : recentes.length === 0 ? (
          <div className="p-10 text-center text-cream/40 text-sm">
            Nenhuma entrada registrada ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {recentes
              .filter((m) => {
                const q = search.trim().toLowerCase();
                return !q || (m.produto?.nome ?? '').toLowerCase().includes(q);
              })
              .map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-cream truncate">
                      {m.produto?.nome ?? 'Produto'}
                      {m.estornado && (
                        <span className="ml-2 text-[10px] uppercase text-cream/40">(estornado)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-cream/40 truncate">
                      {fmtDataHora(m.data_movimentacao ?? m.created_at)} ·{' '}
                      {m.fornecedor?.nome ?? 'Sem fornecedor'} · {m.observacao || 'Sem observação'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('font-mono font-semibold text-sm text-[#81FF4D]')}>+{m.quantidade}</p>
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