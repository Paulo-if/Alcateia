import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Booking,
  BookingItem,
  Customer,
  PaymentMethod,
  PaymentStatus,
  Professional,
  Service,
  BumpOffer,
  UpsellOffer,
} from '../types';
import { combineDateAndTime } from '../lib/date';
import { friendlyError, isConflictError } from './errors';

export interface CreateBookingInput {
  cliente: Customer;
  servico: Service;
  professional: Professional | null; // null quando "qualquer profissional"
  dateString: string;
  time: string;
  observations: string | null;
  bump: BumpOffer | null;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface CreatedBooking {
  booking: Booking & { _items?: BookingItem[] };
  items: BookingItem[];
}

const statusNaoBloqueia = ['cancelado', 'nao_compareceu'];

/**
 * Verifica se o intervalo ainda está disponível (dupla checagem antes de inserir).
 * A proteção DEFINITIVA contra concorrência é feita por exclusão no banco
 * (ver migração `alcateia_proteger_double_booking`), usando tsrange GiST.
 */
async function assertStillAvailable(
  professionalId: string | null,
  dateString: string,
  time: string,
  totalMinutes: number,
): Promise<void> {
  if (!isSupabaseConfigured() || !professionalId) return;

  const start = combineDateAndTime(dateString, time);
  const end = new Date(start.getTime() + totalMinutes * 60000);

  const { data, error } = await getSupabase()
    .from('agendamentos')
    .select('id')
    .eq('professional_id', professionalId)
    .not('status', 'in', `(${statusNaoBloqueia.join(',')})`)
    .lt('data_inicio', end.toISOString())
    .gt('data_fim', start.toISOString());

  if (error) throw new Error(friendlyError(error, 'Não foi possível validar a disponibilidade.'));
  if (data && data.length > 0) {
    throw new Error('Este horário acabou de ser reservado. Escolha outro horário.');
  }
}

/**
 * Cria o agendamento real (e a venda de bump quando adicionado) no banco.
 * Lança erro amigável de conflito quando o horário acabou de ser reservado.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  const {
    cliente,
    servico,
    professional,
    dateString,
    time,
    observations,
    bump,
    paymentMethod,
    idempotencyKey,
  } = input;

  const bumpMinutes = bump?.additionalMinutes ?? 0;
  const totalMinutes = servico.duracao_minutos + bumpMinutes;

  const startAt = combineDateAndTime(dateString, time);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60000);

  if (!isSupabaseConfigured()) {
    // Modo demonstração: simula criação com idempotência local.
    const booking: Booking = {
      id: `dev-${idempotencyKey}`,
      cliente_id: cliente.id,
      servico_id: servico.id,
      professional_id: professional?.id ?? null,
      data_inicio: startAt.toISOString(),
      data_fim: endAt.toISOString(),
      status: 'confirmado',
      valor_servico: servico.preco + (bump?.price ?? 0),
      observacoes: observations,
      payment_method: paymentMethod,
      payment_status: (paymentMethod === 'in_person' ? 'pending' : 'pending') as PaymentStatus,
      payment_id: null,
      paid_at: null,
    };
    const items: BookingItem[] = [];
    if (bump) {
      items.push({ product_id: bump.product?.id, valor_pago: bump.price });
    }
    return { booking, items };
  }

  const supabase = getSupabase();

  // Dupla checagem (frontend) antes de inserir.
  await assertStillAvailable(professional?.id ?? null, dateString, time, totalMinutes);

  // Idempotência: se já criamos esta reserva antes (mesma chave), retorna a mesma.
  const existingByKey = await supabase
    .from('agendamentos')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existingByKey.data) {
    return { booking: existingByKey.data as Booking, items: [] };
  }

  const { data: booking, error: bookingError } = await supabase
    .from('agendamentos')
    .insert({
      professional_id: professional?.id ?? null,
      cliente_id: cliente.id,
      servico_id: servico.id,
      data_inicio: startAt.toISOString(),
      data_fim: endAt.toISOString(),
      status: 'confirmado',
      valor_servico: servico.preco + (bump?.price ?? 0),
      observacoes: observations || null,
      payment_method: paymentMethod,
      payment_status: 'pending',
      // armazena a chave de idempotência para evitar duplicação no reenvio
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .single();

  if (bookingError) {
    if (isConflictError(bookingError)) {
      throw new Error('Este horário acabou de ser reservado. Escolha outro horário.');
    }
    throw new Error(friendlyError(bookingError, 'Não foi possível criar o agendamento.'));
  }

  const items: BookingItem[] = [];

  if (bump?.product) {
    const { error: bumpError } = await supabase.from('vendas_bump').insert({
      agendamento_id: booking.id,
      produto_id: bump.product.id,
      valor_pago: bump.price,
    });
    if (bumpError) throw new Error(friendlyError(bumpError, 'Não foi possível adicionar a oferta.'));
    items.push({ product_id: bump.product.id, valor_pago: bump.price });
  }

  return { booking: booking as Booking, items };
}

/**
 * Registra uma venda de Upsell (produto pós-pagamento). Opcional — nunca impede
 * a conclusão da reserva.
 */
export async function addUpsellSale(input: {
  agendamentoId: string;
  offer: UpsellOffer;
}): Promise<void> {
  const { agendamentoId, offer } = input;

  if (!isSupabaseConfigured()) return;

  const { error } = await getSupabase().from('vendas_bump').insert({
    agendamento_id: agendamentoId,
    produto_id: offer.id,
    valor_pago: offer.price,
  });
  if (error) {
    // Upsell nunca deve bloquear a reserva — apenas loga.
    console.warn('Não foi possível registrar o upsell:', error.message);
  }
}
