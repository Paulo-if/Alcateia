export interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  icone: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco_original: number;
  preco_bump: number;
  imagem_url: string | null;
  ativo: boolean;
  is_order_bump?: boolean;
  estoque_atual?: number;
  estoque_minimo?: number;
  categoria?: string | null;
  marca?: string | null;
  sku?: string | null;
  unidade_medida?: string | null;
  custo_compra?: number | null;
  data_validade?: string | null;
  fornecedor_id?: string | null;
  created_at: string;
}

export type EstoqueMovimentacaoTipo = 'entrada' | 'saida';

export type EstoqueMovimentacaoOrigem =
  | 'manual'
  | 'venda'
  | 'order_bump'
  | 'ajuste'
  | 'consumo'
  | 'perda'
  | 'servico';

export interface EstoqueMovimentacao {
  id: string;
  barbearia_id: string;
  produto_id: string;
  tipo: EstoqueMovimentacaoTipo;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  origem: EstoqueMovimentacaoOrigem;
  referencia_id: string | null;
  estornado: boolean;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  data_movimentacao?: string;
  valor_unitario?: number | null;
  fornecedor_id?: string | null;
  nota_fiscal?: string | null;
  motivo?: string | null;
  cliente_id?: string | null;
}

export interface EstoqueMovimentacaoFull extends EstoqueMovimentacao {
  produto?: { nome: string } | null;
  fornecedor?: { nome: string } | null;
  cliente?: { nome: string } | null;
  responsavel?: { nome: string } | null;
}

export interface Fornecedor {
  id: string;
  barbearia_id?: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ProdutoServico {
  id: string;
  servico_id: string;
  produto_id: string;
  quantidade: number;
  created_at?: string;
  produto?: Pick<Produto, 'id' | 'nome' | 'unidade_medida'> | null;
}

export interface EstoqueKpis {
  total_unidades: number;
  valor_total_estoque: number;
  skus_baixo: number;
  skus_esgotados: number;
  skus_vencidos: number;
  skus_vencendo: number;
  total_produtos: number;
}

export interface RankingItem {
  produto_id: string;
  produto_nome: string;
  total: number;
}

export interface CompraReportItem {
  data_movimentacao: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number | null;
  total: number;
  fornecedor_nome: string | null;
  nota_fiscal: string | null;
  responsavel: string | null;
}

export interface PerdaReportItem {
  data_movimentacao: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  custo_unitario: number | null;
  valor_total: number;
  responsavel: string | null;
  motivo: string | null;
}

export interface CustoServicoItem {
  servico_id: string;
  servico_nome: string;
  custo_total: number;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  created_at: string;
}

export interface Agendamento {
  id: string;
  cliente_id: string | null;
  servico_id: string;
  professional_id: string | null;
  data_inicio: string;
  data_fim: string;
  status: string;
  valor_servico: number;
  observacoes: string | null;
  created_at: string;
}

export interface VendaBump {
  id: string;
  agendamento_id: string;
  produto_id: string;
  valor_pago: number;
  created_at: string;
}

export interface TransacaoFinanceira {
  id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
  categoria: string | null;
  agendamento_id: string | null;
  created_at: string;
}

export interface AgendamentoWithRelations extends Agendamento {
  servico?: Pick<Servico, 'id' | 'nome' | 'duracao_minutos'>;
  cliente?: Pick<Cliente, 'id' | 'nome' | 'telefone'>;
}

export type Papel = 'master' | 'barbeiro';

export interface Profissional {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at: string;
}

export interface Usuario {
  id: string;
  barbearia_id: string;
  auth_user_id: string | null;
  profissional_id: string | null;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  created_at: string;
  profissional?: Pick<Profissional, 'id' | 'name' | 'specialty' | 'avatar_url'> | null;
}

/** Horário de trabalho semanal de um profissional (day_of_week 1=Segunda ... 7=Domingo). */
export interface ProfessionalSchedule {
  id: string;
  professional_id: string;
  barbearia_id: string;
  day_of_week: number; // 1 (Segunda) a 7 (Domingo)
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  active: boolean;
  created_at: string;
}

/** Dia de folga/bloqueio específico de um profissional. */
export interface ProfessionalTimeOff {
  id: string;
  professional_id: string;
  barbearia_id: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
}
