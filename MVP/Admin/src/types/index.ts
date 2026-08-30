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
  created_at: string;
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
