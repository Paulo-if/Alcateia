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
  profissional?: Pick<Profissional, 'id' | 'name'> | null;
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
  date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
}
