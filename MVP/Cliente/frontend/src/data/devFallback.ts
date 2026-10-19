// MODO DE DEMONSTRAÇÃO LOCAL (fallback)
// ======================================
// Estes dados EXISTEM APENAS para permitir desenvolvimento/visualização quando as
// variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão configuradas.
// São claramente sinalizados no app como "modo de demonstração" e NUNCA devem ser
// confundidos com dados reais de produção. Assim que o Supabase for configurado,
// estes dados são ignorados e o app passa a consumir o banco real.

import type { BumpOffer, Professional, Service } from '../types';

export const DEV_PROFESSIONALS: Professional[] = [
  { id: 'dev-rafael', name: 'Rafael', specialty: 'Especialista em degradê', avatar_url: null, active: true },
  { id: 'dev-carlos', name: 'Carlos', specialty: 'Especialista em barba', avatar_url: null, active: true },
  { id: 'dev-joao', name: 'João', specialty: 'Cortes modernos', avatar_url: null, active: true },
  { id: 'dev-lucas', name: 'Lucas', specialty: 'Corte + barba', avatar_url: null, active: true },
];

export const DEV_SERVICES: Service[] = [
  {
    id: 'dev-corte-degrade',
    nome: 'Corte Degradê',
    descricao: 'Corte degradê navalhado com acabamento e finalização.',
    preco: 45,
    duracao_minutos: 40,
    icone: 'scissors',
    ativo: true,
    ordem: 1,
  },
  {
    id: 'dev-combo',
    nome: 'Corte + Barba',
    descricao: 'Corte completo + barba em um só horário.',
    preco: 85,
    duracao_minutos: 70,
    icone: 'scissors',
    ativo: true,
    ordem: 2,
  },
  {
    id: 'dev-barba',
    nome: 'Barba',
    descricao: 'Barba completa com acabamento.',
    preco: 35,
    duracao_minutos: 30,
    icone: 'scissors',
    ativo: true,
    ordem: 3,
  },
  {
    id: 'dev-classico',
    nome: 'Corte Clássico',
    descricao: 'Corte clássico com linha precisa e acabamento premium.',
    preco: 60,
    duracao_minutos: 50,
    icone: 'scissors',
    ativo: true,
    ordem: 4,
  },
];

// Ofertas de Order Bump (dev). Estruturalmente um array para o carrossel de até
// 3 produtos — pronto para receber a lista real do Supabase (`produtos` ativos).
export const DEV_BUMP_OFFERS: BumpOffer[] = [
  {
    type: 'product',
    name: 'Pomada Modeladora',
    description: 'Fixação leve para acabamento impecável.',
    price: 25,
    originalPrice: 45,
    additionalMinutes: 0,
    imageUrl: null,
    product: {
      id: 'dev-pomada',
      nome: 'Pomada Modeladora',
      descricao: 'Fixação leve para acabamento impecável.',
      preco_original: 45,
      preco_bump: 25,
      imagem_url: null,
      ativo: true,
    },
  },
  {
    type: 'product',
    name: 'Óleo pós-barba',
    description: 'Hidrata e acalma a pele após a barba.',
    price: 35,
    originalPrice: 60,
    additionalMinutes: 0,
    imageUrl: null,
    product: {
      id: 'dev-oleo',
      nome: 'Óleo pós-barba',
      descricao: 'Hidrata e acalma a pele após a barba.',
      preco_original: 60,
      preco_bump: 35,
      imagem_url: null,
      ativo: true,
    },
  },
  {
    type: 'product',
    name: 'Kit Hydra Boost',
    description: 'Shampoo + finalizador para manter o corte em casa.',
    price: 50,
    originalPrice: 90,
    additionalMinutes: 0,
    imageUrl: null,
    product: {
      id: 'dev-kit',
      nome: 'Kit Hydra Boost',
      descricao: 'Shampoo + finalizador para manter o corte em casa.',
      preco_original: 90,
      preco_bump: 50,
      imagem_url: null,
      ativo: true,
    },
  },
];

// "Agendamentos" existentes (dev) usados para simular bloqueio de horários por profissional.
export const DEV_BOOKED_BLOCKS: Record<string, string[]> = {
  'dev-rafael': ['10:30'],
  'dev-carlos': [],
  'dev-joao': ['11:00'],
  'dev-lucas': [],
  any: [],
};
