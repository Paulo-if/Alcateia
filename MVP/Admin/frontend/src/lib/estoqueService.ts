import { supabase } from '@/lib/supabase';
import type {
  EstoqueMovimentacao,
  EstoqueMovimentacaoFull,
  EstoqueMovimentacaoOrigem,
  EstoqueMovimentacaoTipo,
  EstoqueKpis,
  RankingItem,
  CompraReportItem,
  PerdaReportItem,
  CustoServicoItem,
} from '@/types';
import type { Fornecedor, ProdutoServico } from '@/types';

export interface MovimentarEstoqueInput {
  produto_id: string;
  tipo: EstoqueMovimentacaoTipo;
  quantidade: number;
  observacao?: string | null;
}

export interface MovimentarEstoqueResult {
  movimentacao: EstoqueMovimentacao | null;
  error: string | null;
}

export interface RegistroEntradaInput {
  produto_id: string;
  quantidade: number;
  valor_unitario?: number | null;
  fornecedor_id?: string | null;
  nota_fiscal?: string | null;
  data_movimentacao?: string | null;
  observacao?: string | null;
}

export type MotivoSaida = 'Consumo interno' | 'Perda/avaria' | 'Ajuste manual';

export interface RegistroSaidaInput {
  produto_id: string;
  quantidade: number;
  motivo: MotivoSaida;
  observacao?: string | null;
}

export interface InventarioInput {
  produto_id: string;
  quantidade_fisica: number;
  motivo: string;
  observacao?: string | null;
}

export interface MovimentacaoFiltros {
  produto_id?: string;
  tipo?: EstoqueMovimentacaoTipo;
  origem?: EstoqueMovimentacaoOrigem;
  cliente_id?: string;
  fornecedor_id?: string;
  criado_por?: string;
  inicio?: string;
  fim?: string;
  limite?: number;
  pagina?: number;
}

function erroAmigavel(errorMessage: string | undefined, fallback: string): string {
  if (!errorMessage) return fallback;
  if (errorMessage.includes('Estoque insuficiente')) return 'Estoque insuficiente para este produto.';
  if (errorMessage.includes('Acesso restrito')) return 'Acesso restrito para a sua função.';
  if (errorMessage.includes('Motivo do ajuste')) return 'O motivo do ajuste é obrigatório.';
  if (errorMessage.includes('Quantidade fisica')) return 'A quantidade física não pode ser negativa.';
  return fallback;
}

export async function registrarEntradaEstoque(input: RegistroEntradaInput): Promise<MovimentarEstoqueResult> {
  const { data, error } = await supabase.rpc('registrar_entrada_estoque', {
    p_produto_id: input.produto_id,
    p_quantidade: input.quantidade,
    p_valor_unitario: input.valor_unitario ?? null,
    p_fornecedor_id: input.fornecedor_id ?? null,
    p_nota_fiscal: input.nota_fiscal?.trim() ? input.nota_fiscal.trim() : null,
    p_data_movimentacao: input.data_movimentacao ?? null,
    p_observacao: input.observacao?.trim() ? input.observacao.trim() : null,
  });

  if (error) return { movimentacao: null, error: erroAmigavel(error.message, 'Não foi possível registrar a entrada.') };
  return { movimentacao: (data as EstoqueMovimentacao) ?? null, error: null };
}

export async function registrarSaidaEstoque(input: RegistroSaidaInput): Promise<MovimentarEstoqueResult> {
  const { data, error } = await supabase.rpc('registrar_saida_estoque', {
    p_produto_id: input.produto_id,
    p_quantidade: input.quantidade,
    p_motivo: input.motivo,
    p_observacao: input.observacao?.trim() ? input.observacao.trim() : null,
  });

  if (error) return { movimentacao: null, error: erroAmigavel(error.message, 'Não foi possível registrar a saída.') };
  return { movimentacao: (data as EstoqueMovimentacao) ?? null, error: null };
}

export async function realizarInventarioEstoque(input: InventarioInput): Promise<MovimentarEstoqueResult> {
  const { data, error } = await supabase.rpc('realizar_inventario', {
    p_produto_id: input.produto_id,
    p_quantidade_fisica: input.quantidade_fisica,
    p_motivo: input.motivo.trim(),
    p_observacao: input.observacao?.trim() ? input.observacao.trim() : null,
  });

  if (error) return { movimentacao: null, error: erroAmigavel(error.message, 'Não foi possível realizar o inventário.') };
  return { movimentacao: (data as EstoqueMovimentacao) ?? null, error: null };
}

export async function fetchEstoqueKpis(): Promise<EstoqueKpis | null> {
  const { data } = await supabase.rpc('kpis_estoque');
  return (data?.[0] as EstoqueKpis) ?? null;
}

export async function fetchRankingVendas(dias: number): Promise<RankingItem[]> {
  const { data } = await supabase.rpc('ranking_vendas', { p_dias: dias });
  return (data as RankingItem[]) ?? [];
}

export async function fetchRankingConsumo(dias: number): Promise<RankingItem[]> {
  const { data } = await supabase.rpc('ranking_consumo', { p_dias: dias });
  return (data as RankingItem[]) ?? [];
}

export async function fetchProdutosParados(dias: number): Promise<Array<{ id: string; nome: string; ativo: boolean }>> {
  const { data } = await supabase.rpc('rel_produtos_parados', { p_dias: dias });
  return (data as Array<{ id: string; nome: string; ativo: boolean }>) ?? [];
}

export async function fetchRelCompras(inicio: string, fim: string): Promise<CompraReportItem[]> {
  const { data } = await supabase.rpc('rel_compras', { p_inicio: inicio, p_fim: fim });
  return (data as CompraReportItem[]) ?? [];
}

export async function fetchRelPerdas(inicio: string, fim: string): Promise<PerdaReportItem[]> {
  const { data } = await supabase.rpc('rel_perdas', { p_inicio: inicio, p_fim: fim });
  return (data as PerdaReportItem[]) ?? [];
}

export async function fetchRelCustoServicos(): Promise<CustoServicoItem[]> {
  const { data } = await supabase.rpc('rel_custo_servicos');
  return (data as CustoServicoItem[]) ?? [];
}

export async function listarMovimentacoesFull(
  filtros: MovimentacaoFiltros = {},
): Promise<EstoqueMovimentacaoFull[]> {
  const limite = filtros.limite ?? 200;
  const pagina = filtros.pagina ?? 0;

  let query = supabase
    .from('estoque_movimentacoes')
    .select(
      '*, produto:produtos(nome, unidade_medida), fornecedor:fornecedores(nome), cliente:clientes(nome)',
    )
    .order('data_movimentacao', { ascending: false })
    .range(pagina * limite, pagina * limite + limite - 1);

  if (filtros.produto_id) query = query.eq('produto_id', filtros.produto_id);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.origem) query = query.eq('origem', filtros.origem);
  if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id);
  if (filtros.fornecedor_id) query = query.eq('fornecedor_id', filtros.fornecedor_id);
  if (filtros.criado_por) query = query.eq('criado_por', filtros.criado_por);
  if (filtros.inicio) query = query.gte('data_movimentacao', filtros.inicio);
  if (filtros.fim) query = query.lte('data_movimentacao', filtros.fim);

  const { data } = await query;
  return (data as EstoqueMovimentacaoFull[]) ?? [];
}

/** Igual a listarMovimentacoesFull, porém inclui o responsável (usuarios).
 *  Só usar em páginas master-only: barbeiros não têm SELECT em usuarios. */
export async function listarMovimentacoesComResponsavel(
  filtros: MovimentacaoFiltros = {},
): Promise<EstoqueMovimentacaoFull[]> {
  const limite = filtros.limite ?? 200;
  const pagina = filtros.pagina ?? 0;

  let query = supabase
    .from('estoque_movimentacoes')
    .select(
      '*, produto:produtos(nome, unidade_medida), fornecedor:fornecedores(nome), cliente:clientes(nome), responsavel:usuarios(nome)',
    )
    .order('data_movimentacao', { ascending: false })
    .range(pagina * limite, pagina * limite + limite - 1);

  if (filtros.produto_id) query = query.eq('produto_id', filtros.produto_id);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.origem) query = query.eq('origem', filtros.origem);
  if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id);
  if (filtros.fornecedor_id) query = query.eq('fornecedor_id', filtros.fornecedor_id);
  if (filtros.criado_por) query = query.eq('criado_por', filtros.criado_por);
  if (filtros.inicio) query = query.gte('data_movimentacao', filtros.inicio);
  if (filtros.fim) query = query.lte('data_movimentacao', filtros.fim);

  const { data } = await query;
  return (data as EstoqueMovimentacaoFull[]) ?? [];
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const { data } = await supabase
    .from('fornecedores')
    .select('*')
    .order('nome');
  return (data as import('@/types').Fornecedor[]) ?? [];
}

export interface FornecedorForm {
  nome: string;
  documento?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
}

export async function salvarFornecedor(form: FornecedorForm, id?: string): Promise<{ error: string | null }> {
  const { error } = id
    ? await supabase.from('fornecedores').update(form).eq('id', id)
    : await supabase.from('fornecedores').insert({ ...form, ativo: true });
  if (error) return { error: error.message.includes('uq_fornecedores') ? 'Já existe um fornecedor com esse nome.' : 'Não foi possível salvar o fornecedor.' };
  return { error: null };
}

export async function setFornecedorAtivo(id: string, ativo: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('fornecedores').update({ ativo }).eq('id', id);
  return { error: error ? 'Não foi possível alterar o fornecedor.' : null };
}

export async function listarProdutosServico(servicoId?: string): Promise<ProdutoServico[]> {
  let query = supabase
    .from('produto_servico')
    .select('*, produto:produtos(id, nome, unidade_medida)')
    .order('created_at', { ascending: false });
  if (servicoId) query = query.eq('servico_id', servicoId);
  const { data } = await query;
  return (data as ProdutoServico[]) ?? [];
}

export async function vincularProdutoServico(servico_id: string, produto_id: string, quantidade: number) {
  return supabase.from('produto_servico').insert({ servico_id, produto_id, quantidade });
}

export async function desvincularProdutoServico(id: string) {
  return supabase.from('produto_servico').delete().eq('id', id);
}

export async function atualizarQuantidadeProdutoServico(id: string, quantidade: number) {
  return supabase.from('produto_servico').update({ quantidade }).eq('id', id);
}

/** Movimentação manual genérica (mantida p/ compatibilidade com telas antigas). */
export async function movimentarEstoque(input: MovimentarEstoqueInput): Promise<MovimentarEstoqueResult> {
  const { data, error } = await supabase.rpc('movimentar_estoque', {
    p_produto_id: input.produto_id,
    p_tipo: input.tipo,
    p_quantidade: input.quantidade,
    p_observacao: input.observacao?.trim() ? input.observacao.trim() : null,
  });

  if (error) return { movimentacao: null, error: erroAmigavel(error.message, 'Não foi possível registrar a movimentação.') };
  return { movimentacao: (data as EstoqueMovimentacao) ?? null, error: null };
}

export async function listarMovimentacoes(
  filtros: MovimentacaoFiltros = {},
): Promise<EstoqueMovimentacao[]> {
  let query = supabase
    .from('estoque_movimentacoes')
    .select('*')
    .order('data_movimentacao', { ascending: false })
    .limit(200);

  if (filtros.produto_id) query = query.eq('produto_id', filtros.produto_id);
  if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
  if (filtros.origem) query = query.eq('origem', filtros.origem);

  const { data } = await query;
  return (data as EstoqueMovimentacao[]) ?? [];
}