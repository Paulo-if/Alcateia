import type { ElementType } from 'react';
import { Scissors, Sparkles, Wand2, Eye, Flame, Crown, Shield, Tag } from 'lucide-react';
import type { EstoqueMovimentacaoOrigem, Produto, Fornecedor } from '@/types';
import { formatCurrency, formatDateInput } from '@/lib/utils';

export const JANELA_VALIDADE_DIAS = 30;

export const UNIDADES_MEDIDA = ['un', 'g', 'ml', 'cx', 'fr'] as const;

export const MOTIVOS_SAIDA = ['Consumo interno', 'Perda/avaria', 'Ajuste manual'] as const;

export const categoriaOptions = [
  'Cabelo',
  'Barba',
  'Pele',
  'Higiene pessoal',
  'Estética',
  'Acessórios',
  'Embalagem',
  'Limpeza',
  'Outros',
] as string[];

export interface EstoquePanelProps {
  produtos: Produto[];
  fornecedores: Fornecedor[];
  refresh: () => void;
  initialProdutoId?: string | null;
  onOpenProduto?: (produto: Produto) => void;
  onRegistrarEntrada?: (produto: Produto) => void;
  onRegistrarSaida?: (produto: Produto) => void;
  onToggleAtivo?: (produto: Produto) => void;
}

/** Ícones dos produtos/serviços (chave vem de imagem_url "icon:<key>" ou do serviço.icone). */
export const iconMap: Record<string, ElementType> = {
  scissors: Scissors,
  sparkles: Sparkles,
  wand: Wand2,
  eye: Eye,
  flame: Flame,
  crown: Crown,
  shield: Shield,
  tag: Tag,
};

export function fmtMoeda(v: number | null | undefined): string {
  return formatCurrency(v ?? 0);
}

export function fmtDataHora(iso: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function fmtData(iso: string | Date): string {
  return formatDateInput(typeof iso === 'string' ? new Date(iso) : iso);
}

export const origemLabel: Record<EstoqueMovimentacaoOrigem, string> = {
  manual: 'Manual',
  venda: 'Venda',
  order_bump: 'Order Bump',
  ajuste: 'Ajuste',
  consumo: 'Consumo interno',
  perda: 'Perda',
  servico: 'Serviço',
};

export const origemDotColor: Record<EstoqueMovimentacaoOrigem, string> = {
  manual: 'bg-sky-400',
  venda: 'bg-[#81FF4D]',
  order_bump: 'bg-[#FFD166]',
  ajuste: 'bg-violet-400',
  consumo: 'bg-amber-400',
  perda: 'bg-red-400',
  servico: 'bg-highlight',
};

export type SituacaoEstoque = 'normal' | 'baixo' | 'esgotado';

export function situacaoEstoque(p: Pick<Produto, 'estoque_atual' | 'estoque_minimo'> | undefined): SituacaoEstoque {
  const atual = p?.estoque_atual ?? 0;
  const minimo = p?.estoque_minimo ?? 0;
  if (atual <= 0) return 'esgotado';
  if (minimo > 0 && atual <= minimo) return 'baixo';
  return 'normal';
}

export function margemProduto(p: Produto): number | null {
  if (p.custo_compra === null || p.custo_compra === undefined) return null;
  return p.preco_original - p.custo_compra;
}

export function validadeInfo(p: Produto): {
  status: 'sem' | 'ok' | 'vencendo' | 'vencido';
  label: string;
  diff: number | null;
} {
  if (!p.data_validade) return { status: 'sem', label: '—', diff: null };
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = p.data_validade.split('-').map(Number);
  const alvo = new Date(y, m - 1, d);
  const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return { status: 'vencido', label: 'Vencido', diff };
  if (diff <= JANELA_VALIDADE_DIAS) return { status: 'vencendo', label: `Vence em ${diff} dia${diff === 1 ? '' : 's'}`, diff };
  return { status: 'ok', label: `Vence em ${diff} dias`, diff };
}

export const inputClass = (extra?: string): string =>
  `w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1EA] focus:outline-none focus:border-highlight/50 ${extra ?? ''}`;

/** Saídas manuais classificáveis (painel "Saídas") — exclui venda/bump/serviço. */
export function filtroSaidaValido(origem: EstoqueMovimentacaoOrigem): boolean {
  return origem === 'manual' || origem === 'consumo' || origem === 'perda';
}

/** Constrói filtros de busca reutilizáveis nos painéis de estoque. */
export function filtrarPorNome<T extends { nome: string }>(q: string, items: T[]): T[] {
  const termo = q.trim().toLowerCase();
  if (!termo) return items;
  return items.filter((i) => i.nome.toLowerCase().includes(termo));
}