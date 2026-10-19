import { Tag, Boxes, PackagePlus, PackageMinus } from 'lucide-react';
import type { Produto, Fornecedor } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Switch } from '@/components/ui/Switch';
import {
  iconMap,
  situacaoEstoque,
  margemProduto,
  validadeInfo,
  fmtMoeda,
} from './estoqueUi';

interface EstoqueProdutoCardProps {
  produto: Produto;
  fornecedor?: Fornecedor;
  onOpen?: (produto: Produto) => void;
  onToggleAtivo?: (produto: Produto) => void;
  onRegistrarEntrada?: (produto: Produto) => void;
  onRegistrarSaida?: (produto: Produto) => void;
}

/** Card visual padrão de produto (mesmo usado na listagem de Produtos). */
export function EstoqueProdutoCard({
  produto,
  fornecedor,
  onOpen,
  onToggleAtivo,
  onRegistrarEntrada,
  onRegistrarSaida,
}: EstoqueProdutoCardProps) {
  const isImage = produto.imagem_url && (produto.imagem_url.startsWith('http') || produto.imagem_url.startsWith('data:image'));
  const isIconPrefixed = produto.imagem_url && produto.imagem_url.startsWith('icon:');
  const iconKey = isIconPrefixed ? produto.imagem_url!.replace('icon:', '') : 'tag';
  const IconComp = iconMap[iconKey] || Tag;
  const situacao = situacaoEstoque(produto);
  const estoqueAtual = produto.estoque_atual ?? 0;
  const estoqueMinimo = produto.estoque_minimo ?? 0;
  const margem = margemProduto(produto);
  const validade = validadeInfo(produto);

  return (
    <div
      onClick={onOpen ? () => onOpen(produto) : undefined}
      className={cn(
        'bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-2xl hover:shadow-black/70 flex flex-col group h-full',
        produto.ativo
          ? 'border-white/10 hover:border-[#81FF4D]/50'
          : 'border-white/5 bg-[#0f0f0f] opacity-60'
      )}
    >
      <div className="relative w-full h-36 bg-[#0a0a0a] flex items-center justify-center overflow-hidden border-b border-white/5">
        {isImage ? (
          <img
            src={produto.imagem_url!}
            alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-[#81FF4D]/10 border border-[#81FF4D]/20 flex items-center justify-center text-[#81FF4D] group-hover:scale-110 group-hover:bg-[#81FF4D] group-hover:text-black transition-all">
            <IconComp size={30} />
          </div>
        )}

        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider ${
          produto.is_order_bump
            ? 'bg-[#81FF4D]/20 border-[#81FF4D]/40 text-[#81FF4D]'
            : 'bg-white/10 border-white/20 text-cream/60'
        }`}>
          {produto.is_order_bump ? 'Order Bump' : 'Catálogo'}
        </div>

        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-bold uppercase tracking-wider',
          situacao === 'esgotado'
            ? 'bg-red-500/20 border-red-500/40 text-red-400'
            : situacao === 'baixo'
              ? 'bg-[#FFD166]/20 border-[#FFD166]/40 text-[#FFD166]'
              : 'bg-[#81FF4D]/15 border-[#81FF4D]/30 text-[#81FF4D]'
        )}>
          {situacao === 'normal' ? 'Em estoque' : situacao === 'baixo' ? 'Estoque baixo' : 'Esgotado'}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-display text-xl text-[#F5F1EA] tracking-wide group-hover:text-[#81FF4D] transition-colors leading-tight">
              {produto.nome}
            </h3>
            <div onClick={(e) => e.stopPropagation()}>
              {onToggleAtivo && (
                <Switch
                  checked={produto.ativo}
                  onChange={() => onToggleAtivo(produto)}
                  size="md"
                  label={`Status do produto ${produto.nome}`}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-cream/50 line-clamp-2 mb-3 leading-relaxed">
            {produto.descricao || 'Produto complementar para oferta no agendamento.'}
          </p>

          {/* Detalhes gerenciais: categoria, marca, fornecedor, validade e margem */}
          <div className="space-y-1 mb-3 text-[11px] text-cream/50">
            {(produto.categoria || produto.marca) && (
              <p className="truncate">
                {[produto.categoria, produto.marca].filter(Boolean).join(' · ')}
              </p>
            )}
            {fornecedor && <p className="truncate">Fornecedor: {fornecedor.nome}</p>}
            {produto.sku && <p className="font-mono text-cream/40 truncate">SKU: {produto.sku}</p>}
            <div className="flex items-center gap-2">
              <span>
                Custo {fmtMoeda(produto.custo_compra)}
              </span>
              <span className={cn(
                margem === null ? 'text-cream/30' : margem < 0 ? 'text-red-400 font-semibold' : 'text-[#81FF4D] font-semibold',
              )}>
                {margem === null ? 'Custo não informado' : `Margem ${fmtMoeda(margem)}`}
              </span>
            </div>
            <p className={cn(
              validade.status === 'sem' && 'text-cream/30',
              validade.status === 'vencido' && 'text-red-400 font-semibold',
              validade.status === 'vencendo' && 'text-[#FFD166] font-semibold',
              validade.status === 'ok' && 'text-cream/50',
            )}>
              Validade: {validade.label}
            </p>
          </div>
        </div>

        <div className="mb-3 rounded-xl bg-black/30 border border-white/5 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs min-w-0">
            <Boxes
              size={14}
              className={cn(
                'shrink-0',
                situacao === 'esgotado' ? 'text-red-400' : situacao === 'baixo' ? 'text-[#FFD166]' : 'text-[#81FF4D]'
              )}
            />
            <span className="text-cream/50 truncate">Estoque</span>
            <span className={cn(
              'font-mono font-semibold',
              situacao === 'esgotado' ? 'text-red-400' : situacao === 'baixo' ? 'text-[#FFD166]' : 'text-cream'
            )}>
              {estoqueAtual}
            </span>
            <span className="text-cream/30 font-mono">/ mín {estoqueMinimo} {produto.unidade_medida ?? 'un'}</span>
          </div>
          {(onRegistrarEntrada || onRegistrarSaida) && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                title="Registrar entrada de estoque"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegistrarEntrada?.(produto);
                }}
                className="p-1.5 rounded-lg text-[#81FF4D] bg-[#81FF4D]/10 border border-[#81FF4D]/25 hover:bg-[#81FF4D]/25 transition-all"
              >
                <PackagePlus size={14} />
              </button>
              <button
                type="button"
                title="Registrar saída de estoque"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegistrarSaida?.(produto);
                }}
                className="p-1.5 rounded-lg text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 transition-all"
              >
                <PackageMinus size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div>
            {produto.is_order_bump && produto.preco_bump > 0 ? (
              <>
                <span className="text-[10px] text-cream/40 block font-medium">Preço de Oferta</span>
                <span className="font-display text-2xl text-[#81FF4D]">
                  {formatCurrency(produto.preco_bump)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] text-cream/40 block font-medium">Preço</span>
                <span className="font-display text-2xl text-[#81FF4D]">
                  {formatCurrency(produto.preco_original)}
                </span>
              </>
            )}
          </div>
          {produto.is_order_bump && produto.preco_original > produto.preco_bump && (
            <div className="text-right">
              <span className="text-[10px] text-cream/30 block">Original</span>
              <span className="text-xs text-cream/40 line-through">
                {formatCurrency(produto.preco_original)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}