import type {
  Booking,
  PaymentMethod,
  PaymentStatus,
  PaymentWebhookPayload,
} from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { friendlyError } from './errors';

export interface CheckoutResult {
  redirectUrl: string;
  paymentId: string;
}

/**
 * Camada de pagamento isolada.
 *
 * "PAGAR NO LOCAL": nenhum gateway envolvido — a reserva é criada com
 * payment_method=in_person e payment_status=pending. NUNCA marcamos paid.
 *
 * "PAGAR AGORA": integra um gateway de pagamento real (Pix/Cartão) via
 * paymentService. O checkout cria um contexto de pagamento pending; a confirmação
 * DEFINITIVA vem apenas do webhook (payment_status=paid), nunca do retorno do navegador.
 *
 * ATENÇÃO: para ativar o "Pagar Agora" de ponta a ponta é necessário configurar um
 * provedor (ex.: Mercado Pago, Stripe, Pagar.me) e uma Edge Function em Supabase que
 * receba o webhook. Até lá, este serviço expõe um PLACEHOLDER OPERACIONAL que cria o
 * contexto e sinaliza que o gateway está pendente de configuração — sem fabricar "pago".
 */

function requireProvider() {
  // TODO(integração): substituir pelo provider escolhido.
  const provider = (import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined) || '';
  return provider;
}

/**
 * Inicia o checkout online para uma reserva.
 * Cria o payment_id via provider e retorna a URL de redirecionamento.
 * Lança erro claro quando o provider não está configurado.
 */
export async function createOnlineCheckout(input: {
  booking: Booking;
  customerName: string;
  customerPhone: string;
  amount: number;
}): Promise<CheckoutResult> {
  const provider = requireProvider();

  if (!provider) {
    // Placeholder operacional: sinaliza claramente que o gateway precisa ser configurado.
    throw new Error(
      'O pagamento online ainda não foi configurado. Configure o provedor de pagamento (VITE_PAYMENT_PROVIDER) ' +
        'e a Edge Function de webhook no Supabase para ativar o "Pagar Agora". Enquanto isso, a reserva pode ser ' +
        'criada com "Pagar no Local".',
    );
  }

  // Quando o provider estiver configurado, a implementação real ficaria aqui,
  // integrando com o SDK do gateway e criando a cobrança (payment_status=pending).
  console.info('[paymentService] Iniciando checkout online via', provider, input);

  return {
    paymentId: '', // preenchido pelo gateway
    redirectUrl: '#', // url retornada pelo gateway
  };
}

/**
 * Processa o webhook de pagamento de forma IDEMPOTENTE.
 * A receita nunca é registrada em duplicidade (atualiza por payment_id).
 * O webhook é armazenado em tabela própria e processado sigilosamente em Edge Function.
 */
export async function processPaymentWebhook(payload: PaymentWebhookPayload): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('payment_id', payload.payment_id)
    .maybeSingle();

  if (lookupError) throw new Error(friendlyError(lookupError, 'Erro ao processar webhook.'));

  if (existing) {
    // Idempotente: já processado. Atualiza apenas se o status mudou para "paid".
    if (existing.status !== 'paid' && payload.payment_status === 'paid') {
      const { error } = await supabase
        .from('pagamentos')
        .update({ status: payload.payment_status, paid_at: payload.paid_at ?? null })
        .eq('payment_id', payload.payment_id);
      if (error) throw new Error(friendlyError(error, 'Erro ao atualizar pagamento.'));
    }
    return;
  }

  const { error } = await supabase.from('pagamentos').insert({
    payment_id: payload.payment_id,
    status: payload.payment_status as PaymentStatus,
    paid_at: payload.paid_at ?? null,
    amount: payload.amount ?? 0,
    agendamento_id: payload.agendamento_id ?? null,
  });
  if (error) throw new Error(friendlyError(error, 'Erro ao registrar pagamento.'));
}

export { PaymentMethod };
