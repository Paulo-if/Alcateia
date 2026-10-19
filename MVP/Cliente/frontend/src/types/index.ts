// Tipos alinhados ao schema real do Supabase (pt-BR, snake_case da barbearia)
// e aos conceitos do fluxo público (Servlet/Profissional/Cliente/Agendamento/Pagamento/Bump/Upsell).

export type PaymentMethod = 'online' | 'in_person';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// ============================ BARBEARIA ============================

export interface BarbershopSettings {
  id: string;
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  endereco: string | null;
  horario_funcionamento: string | null;
  created_at: string;
}

// ============================ PROFISSIONAL ============================

export interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
  active: boolean;
  created_at?: string;
}

// Opção "Qualquer profissional" representada de forma explícita.
export interface AnyProfessionalOption {
  anyProfessional: true;
}

// ============================ SERVIÇO ============================

export interface Service {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracao_minutos: number;
  icone: string | null;
  ativo: boolean;
  ordem: number;
  created_at?: string;
}

// ============================ PRODUTO (ORDER BUMP / UPSELL) ============================

export interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  preco_original: number;
  preco_bump: number;
  imagem_url: string | null;
  ativo: boolean;
  // Distingue CATÁLOGO de OFERTA DE ORDER BUMP. Um produto ativo NÃO é,
  // automaticamente, uma oferta de Order Bump.
  is_order_bump?: boolean;
  created_at?: string;
}

// Oferta de Order Bump: produto físico (tempo adicional 0) ou micro-serviço.
export interface BumpOffer {
  type: 'product' | 'micro_service';
  product?: Product;
  service?: Service;
  price: number;
  originalPrice?: number;
  additionalMinutes: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface UpsellOffer {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice?: number;
  imageUrl: string | null;
}

// ============================ CLIENTE ============================

export interface Customer {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  created_at?: string;
}

// ============================ AGENDAMENTO ============================

export type BookingStatus = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu';

export interface Booking {
  id: string;
  cliente_id: string | null;
  servico_id: string;
  professional_id: string | null;
  data_inicio: string;
  data_fim: string;
  status: BookingStatus;
  valor_servico: number;
  observacoes: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_id: string | null;
  paid_at: string | null;
  created_at?: string;
}

export interface BookingItem {
  product_id?: string;
  service_id?: string;
  valor_pago: number;
}

// ============================ PAGAMENTO ============================

export interface Payment {
  id: string;
  agendamento_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  provider: string | null;
  paid_at: string | null;
  idempotency_key: string | null;
}

// Payload aceito pelo webhook de pagamento (idempotente).
export interface PaymentWebhookPayload {
  payment_id: string;
  payment_status: PaymentStatus;
  paid_at?: string | null;
  amount?: number;
  agendamento_id?: string;
}
