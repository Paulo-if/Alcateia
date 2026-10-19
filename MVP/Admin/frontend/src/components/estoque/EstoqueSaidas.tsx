import { useEffect, useState } from 'react';
import { PackageMinus, AlertTriangle, Boxes } from 'lucide-react';
import { registrarSaidaEstoque, listarMovimentacoesFull, type MotivoSaida } from '@/lib/estoqueService';
import type { EstoqueMovimentacaoFull } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import {
  EstoquePanelProps,
  inputClass,
  fmtDataHora,
  filtroSaidaValido,
  MOTIVOS_SAIDA,
} from './estoqueUi';
import { cn } from '@/lib/utils';

const motivoHints: Record<MotivoSaida, string> = {
  'Consumo interno': 'Ex.: utilização do pente na barbearia',
  'Perda/avaria': 'Ex.: produto danificado ou vencido descartado',
  'Ajuste manual': 'Ex.: correção de divergência contábil',
};

export function EstoqueSaidas({ produtos, refresh, initialProdutoId }: EstoquePanelProps) {
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState<MotivoSaida | ''>('');
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
      const movs = await listarMovimentacoesFull({ tipo: 'saida', limite: 12 });
      setRecentes(movs.filter((m) => filtroSaidaValido(m.origem)));
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
    if (!motivo) return setError('Selecione o motivo da saída.');

    setBusy(true);
    const { error: err } = await registrarSaidaEstoque({
      produto_id: produtoId,
      quantidade: qty,
      motivo,
      observacao,
    });
    setBusy(false);

    if (err) return setError(err);
    setSucesso(`Saída de ${qty} un. registrada (${motivo}).`);
    setQuantidade('');
    setMotivo('');
    setObservacao('');
    const movs = await listarMovimentacoesFull({ tipo: 'saida', limite: 12 });
    setRecentes(movs.filter((m) => filtroSaidaValido(m.origem)));
    refresh();
  };

  const filtradas = produtos.filter((p) => p.ativo || p.id === produtoId);

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-1 flex items-center gap-2">
          <PackageMinus size={18} className="text-red-400" /> Nova saída
        </h3>
        <p className="text-xs text-cream/40 mb-5">Saída manual com classificação de motivo</p>

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

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Motivo *</label>
            <div className="grid grid-cols-1 gap-2">
              {MOTIVOS_SAIDA.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={cn(
                    'px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border text-left',
                    motivo === m
                      ? 'bg-red-500/15 border-red-500/40 text-red-300 font-bold'
                      : 'bg-[#121212] text-cream/60 border-white/10 hover:text-white hover:bg-white/5',
                  )}
                >
                  {m}
                  <span className="block text-[10px] font-normal text-cream/40 mt-0.5">{motivoHints[m]}</span>
                </button>
              ))}
            </div>
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
          </div>

          <div>
            <label className="block text-xs font-medium text-cream/60 mb-1.5">Observação</label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Contexto da saída..."
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              <PackageMinus size={14} className="shrink-0" /> {sucesso}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full bg-red-500 text-white font-semibold hover:bg-red-400"
          >
            {busy ? 'Registrando...' : 'Confirmar Saída'}
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-3 border-white/10 bg-[#121212]">
        <h3 className="font-display text-lg text-[#F5F1EA] mb-2">Saídas recentes</h3>
        <div className="mb-4 max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Filtrar por produto..." />
        </div>

        {loadingHist ? (
          <div className="p-10 text-center text-cream/40 text-sm animate-pulse">Carregando saídas...</div>
        ) : recentes.length === 0 ? (
          <div className="p-10 text-center text-cream/40 text-sm">
            Nenhuma saída manual registrada ainda.
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
                      {fmtDataHora(m.data_movimentacao ?? m.created_at)} · {m.motivo || '—'} ·{' '}
                      {m.observacao || 'Sem observação'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-semibold text-sm text-red-400">−{m.quantidade}</p>
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