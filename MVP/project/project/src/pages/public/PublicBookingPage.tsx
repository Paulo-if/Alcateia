import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Instagram, MapPin, MessageCircle, Plus, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDateInput } from '@/lib/utils';

type Professional = {
  id: string;
  name: string;
  specialty: string;
  avatar_url?: string | null;
  active?: boolean;
};

type ServiceItem = {
  id: string;
  nome: string;
  descricao: string | null;
  duracao_minutos: number;
  preco: number;
  ativo?: boolean;
};

type ProductItem = {
  id: string;
  nome: string;
  preco_bump: number;
  preco_original: number;
  descricao?: string | null;
  ativo?: boolean;
};

type BookingSelection = {
  professional: Professional | null;
  service: ServiceItem | null;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  bumpSelected: boolean;
};

const professionalFallback: Professional[] = [
  { id: 'rafael', name: 'Rafael', specialty: 'Especialista em cortes', avatar_url: null, active: true },
  { id: 'carlos', name: 'Carlos', specialty: 'Especialista em barba', avatar_url: null, active: true },
  { id: 'joao', name: 'João', specialty: 'Fade e estilos modernos', avatar_url: null, active: true },
  { id: 'lucas', name: 'Lucas', specialty: 'Corte + barba', avatar_url: null, active: true },
];

const serviceFallback: ServiceItem[] = [
  { id: 'degrade', nome: 'Corte Degradê', descricao: 'Corte degradê navalhado com acabamento e finalização.', duracao_minutos: 40, preco: 45, ativo: true },
  { id: 'combo', nome: 'Corte + Barba', descricao: 'Corte completo + barba.', duracao_minutos: 70, preco: 85, ativo: true },
  { id: 'barba', nome: 'Barba', descricao: 'Barba completa com acabamento.', duracao_minutos: 30, preco: 35, ativo: true },
  { id: 'classico', nome: 'Corte Clássico', descricao: 'Corte clássico com linha precisa e acabamento premium.', duracao_minutos: 50, preco: 60, ativo: true },
];

const bumpFallback: ProductItem = {
  id: 'pomada-modeladora',
  nome: 'Pomada Modeladora',
  preco_original: 45,
  preco_bump: 25,
  descricao: 'Fixação leve para acabamento impecável.',
  ativo: true,
};

const stepNames = ['Serviço', 'Horário', 'Dados', 'Resumo'];

const availabilityMap: Record<string, Record<string, string[]>> = {
  rafael: { '2026-08-27': ['15:00', '15:30'], '2026-08-28': ['10:30', '11:00'], '2026-08-29': ['09:00', '09:30'] },
  carlos: { '2026-08-27': ['09:00', '09:30'], '2026-08-28': ['14:00', '14:30'], '2026-08-29': ['15:00', '15:30'] },
  joao: { '2026-08-27': ['11:00', '11:30'], '2026-08-28': ['09:00', '09:30'], '2026-08-29': ['16:00', '16:30'] },
  lucas: { '2026-08-27': ['17:00', '17:30'], '2026-08-28': ['13:00', '13:30'], '2026-08-29': ['12:00', '12:30'] },
};

function getFutureDates() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return formatDateInput(date);
  });
}

const instagramUrl = (import.meta.env.VITE_INSTAGRAM_URL as string | undefined) || '#';

export function PublicBookingPage() {
  const [flowStarted, setFlowStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [professionals, setProfessionals] = useState<Professional[]>(professionalFallback);
  const [services, setServices] = useState<ServiceItem[]>(serviceFallback);
  const [bumpProduct, setBumpProduct] = useState<ProductItem>(bumpFallback);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState<{ professional: string; service: string; date: string; time: string; total: number } | null>(null);
  const [selection, setSelection] = useState<BookingSelection>({
    professional: null,
    service: null,
    date: getFutureDates()[0],
    time: '',
    clientName: '',
    clientPhone: '',
    notes: '',
    bumpSelected: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: profissionaisData }, { data: servicosData }, { data: produtosData }] = await Promise.all([
          supabase.from('profissionais').select('*').eq('active', true).order('created_at', { ascending: true }),
          supabase.from('servicos').select('*').eq('ativo', true).order('ordem', { ascending: true }),
          supabase.from('produtos').select('*').eq('ativo', true).limit(1),
        ]);

        if (Array.isArray(profissionaisData) && profissionaisData.length > 0) {
          setProfessionals(profissionaisData as Professional[]);
        }

        if (Array.isArray(servicosData) && servicosData.length > 0) {
          setServices(servicosData as ServiceItem[]);
        }

        if (Array.isArray(produtosData) && produtosData.length > 0) {
          setBumpProduct(produtosData[0] as ProductItem);
        }
      } catch {
        // fallback local ready while DB schema is not fully synced
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const nextDates = useMemo(() => getFutureDates(), []);

  const availableTimes = useMemo(() => {
    if (!selection.professional || !selection.date || !selection.service) return [];

    const service = selection.service;
    const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
    const dayBlocked = availabilityMap[selection.professional.id]?.[selection.date] ?? [];

    return slots.filter((slot) => {
      const candidateStart = new Date(`${selection.date}T${slot}:00`).getTime();
      const candidateEnd = candidateStart + (service.duracao_minutos || 30) * 60000;

      return !dayBlocked.some((busyTime) => {
        const busyStart = new Date(`${selection.date}T${busyTime}:00`).getTime();
        const busyEnd = busyStart + 40 * 60000;
        return candidateStart < busyEnd && candidateEnd > busyStart;
      });
    });
  }, [selection.date, selection.professional, selection.service]);

  const total = (selection.service?.preco ?? 0) + (selection.bumpSelected ? bumpProduct.preco_bump : 0);

  const canContinue = () => {
    if (step === 1) return Boolean(selection.service);
    if (step === 2) return Boolean(selection.date && selection.time);
    if (step === 3) return Boolean(selection.clientName.trim() && selection.clientPhone.trim());
    return true;
  };

  const goNext = () => {
    if (!canContinue()) return;
    setStep((current) => Math.min(current + 1, 4));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  const openBooking = (professional: Professional) => {
    setSelection((current) => ({ ...current, professional, date: nextDates[0], time: '' }));
    setFlowStarted(true);
    setStep(1);
  };

  const resetFlow = () => {
    setFlowStarted(false);
    setStep(1);
    setConfirmed(false);
    setConfirmation(null);
    setSelection({
      professional: null,
      service: null,
      date: getFutureDates()[0],
      time: '',
      clientName: '',
      clientPhone: '',
      notes: '',
      bumpSelected: false,
    });
  };

  const handleConfirm = async () => {
    if (!selection.professional || !selection.service || !selection.date || !selection.time || !selection.clientName || !selection.clientPhone) {
      return;
    }

    setSubmitting(true);

    try {
      const normalizedPhone = selection.clientPhone.replace(/\D/g, '');
      const { data: existingClient, error: clientLookupError } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', normalizedPhone)
        .maybeSingle();

      let clientId = existingClient?.id as string | undefined;

      if (!clientId && !clientLookupError) {
        const { data: newClient, error: insertClientError } = await supabase
          .from('clientes')
          .insert({ nome: selection.clientName.trim(), telefone: normalizedPhone, email: null })
          .select('id')
          .single();

        if (insertClientError) throw insertClientError;
        clientId = newClient?.id;
      }

      if (!clientId) throw new Error('Não foi possível registrar o cliente.');

      const startAt = new Date(`${selection.date}T${selection.time}:00`).toISOString();
      const endAt = new Date(new Date(startAt).getTime() + (selection.service.duracao_minutos || 30) * 60000).toISOString();

      const { data: appointment, error: appointmentError } = await supabase
        .from('agendamentos')
        .insert({
          professional_id: selection.professional.id,
          cliente_id: clientId,
          servico_id: selection.service.id,
          data_inicio: startAt,
          data_fim: endAt,
          status: 'agendado',
          valor_servico: selection.service.preco,
          observacoes: selection.notes.trim() || null,
        })
        .select('id')
        .single();

      if (appointmentError) throw appointmentError;

      if (selection.bumpSelected && bumpProduct?.id) {
        await supabase.from('vendas_bump').insert({
          agendamento_id: appointment.id,
          produto_id: bumpProduct.id,
          valor_pago: bumpProduct.preco_bump,
        });
      }

      setConfirmation({
        professional: selection.professional.name,
        service: selection.service.nome,
        date: selection.date,
        time: selection.time,
        total,
      });
      setConfirmed(true);
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível confirmar o agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Meu agendamento na AlcateiaBarber foi confirmado.\n\nProfissional: ${selection.professional?.name ?? ''}\nServiço: ${selection.service?.nome ?? ''}\nData: ${selection.date}\nHorário: ${selection.time}\nTotal: ${formatCurrency(total)}`,
  );

  const googleCalendarUrl = (() => {
    if (!selection.professional || !selection.service || !selection.date || !selection.time) return '#';

    const start = new Date(`${selection.date}T${selection.time}:00`);
    const end = new Date(start.getTime() + (selection.service.duracao_minutos || 30) * 60000);
    const formatGoogle = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${selection.professional.name} - ${selection.service.nome}`)}&details=${encodeURIComponent(`Agendamento AlcateiaBarber\nCliente: ${selection.clientName}\nWhatsApp: ${selection.clientPhone}`)}&location=${encodeURIComponent('Alcateia Barber')}&dates=${formatGoogle(start)}/${formatGoogle(end)}`;
  })();

  if (confirmed && confirmation) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-10 text-[#F5F1EA]">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-[#121212] p-6 shadow-2xl shadow-black/30">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#81FF4D]/10 text-[#81FF4D]">
            <CheckCircle2 size={36} />
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Agendamento confirmado</p>
          <h2 className="mt-3 text-center text-3xl font-semibold">Seu horário está reservado.</h2>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-[#0F0F0F] p-4 text-sm text-[#F5F1EA]">
            <div className="flex items-center justify-between gap-3"><span className="text-[#F5F1EA]/60">Profissional</span><strong>{confirmation.professional}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#F5F1EA]/60">Serviço</span><strong>{confirmation.service}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#F5F1EA]/60">Data</span><strong>{confirmation.date}</strong></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#F5F1EA]/60">Horário</span><strong>{confirmation.time}</strong></div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="text-[#F5F1EA]/60">Total</span><strong>{formatCurrency(confirmation.total)}</strong></div>
          </div>

          <div className="mt-6 grid gap-3">
            <a href={`https://wa.me/5511999999999?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-black">
              <MessageCircle size={18} /> Confirmar pelo WhatsApp
            </a>
            <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#4FE7FF]/40 bg-[#1A1A1A] px-4 py-3 text-sm font-semibold text-white">
              <CalendarDays size={18} /> Adicionar à agenda
            </a>
          </div>

          <div className="mt-6 text-center">
            <button type="button" onClick={resetFlow} className="inline-flex items-center gap-2 text-sm text-[#4FE7FF] hover:text-white">
              <ArrowLeft size={16} /> Fazer novo agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!flowStarted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F5F1EA] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto max-w-3xl pt-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#4FE7FF]">Alcateia Barber</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Escolha seu barbeiro</h1>
            <p className="mt-3 text-base text-[#F5F1EA]/70 md:text-lg">Agende seu horário com o profissional de sua preferência.</p>
          </header>

          <main className="mt-10 md:mt-14">
            <div className="grid gap-5 text-center md:grid-cols-2 xl:grid-cols-4">
              {professionals.map((professional) => (
                <article key={professional.id} className="rounded-[28px] border border-white/10 bg-[#111111] p-4 text-center shadow-sm shadow-black/15 transition-all duration-200 hover:border-[#4FE7FF]/60 hover:-translate-y-0.5">
                  <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#171717]">
                    {professional.avatar_url ? (
                      <img src={professional.avatar_url} alt={professional.name} className="h-52 w-full object-cover md:h-60" />
                    ) : (
                      <div className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-[#1D1D1D] via-[#111111] to-[#0D0D0D] text-5xl font-semibold text-[#4FE7FF] md:h-60">
                        {professional.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <h3 className="text-2xl font-semibold">{professional.name}</h3>
                    <p className="mt-2 text-sm text-[#F5F1EA]/65">{professional.specialty}</p>
                  </div>

                  <button type="button" onClick={() => openBooking(professional)} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#4FE7FF] px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-[#0A0A0A] transition-colors duration-200 hover:bg-[#7ae9ff] focus:outline-none focus:ring-2 focus:ring-[#4FE7FF] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]">
                    Agendar
                  </button>
                </article>
              ))}
            </div>

            <section className="mt-16 md:mt-20">
              <div className="mx-auto max-w-4xl text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#4FE7FF]">Localização</p>
                <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Onde estamos</h2>
                <p className="mt-2 text-base text-[#F5F1EA]/70">Venha nos visitar.</p>
              </div>

              <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] p-2 shadow-sm shadow-black/20">
                <iframe
                  title="Mapa da Alcateia Barber"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4318.6965425811695!2d-49.12235538883765!3d-15.335913485180663!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935cc14a8df8df73%3A0x8e073b50d314c9db!2sAlcat%C3%A9ia%20Barbearia!5e1!3m2!1sen!2sbr!4v1787967265768!5m2!1sen!2sbr"
                  className="h-[260px] w-full rounded-[22px] border-0 md:h-[360px]"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <div className="mt-6 text-center">
                <a href="https://www.google.com/maps/search/?api=1&query=Alcateia+Barbearia" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-[#4FE7FF]/50 bg-[#0E1417] px-5 py-3 text-sm font-semibold text-[#4FE7FF] transition-colors hover:bg-[#11232a]">
                  <MapPin className="mr-2" size={16} /> Abrir no Google Maps
                </a>
              </div>
            </section>
          </main>

          <footer className="mt-20 border-t border-white/10 pt-12 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#4FE7FF]">Alcateia Barber</p>
            <p className="mt-4 text-2xl tracking-[-0.04em] md:text-3xl">Seu estilo. Seu barbeiro. Seu horário.</p>
            <a href={instagramUrl} target={instagramUrl === '#' ? undefined : '_blank'} rel={instagramUrl === '#' ? undefined : 'noreferrer'} aria-label="Instagram da Alcateia Barber" className="mt-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#4FE7FF]/40 bg-[#0F0F0F] text-[#4FE7FF] transition-colors hover:bg-[#101d22]">
              <Instagram size={20} />
            </a>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-[#F5F1EA] md:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button type="button" onClick={resetFlow} className="inline-flex items-center gap-2 text-sm text-[#F5F1EA]/70 hover:text-white">
            <ArrowLeft size={16} /> Voltar
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Alcateia Barber</p>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-2 text-center">
          {stepNames.map((label, index) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index + 1 <= step ? 'bg-[#4FE7FF] text-[#0A0A0A]' : 'border border-white/10 bg-transparent text-[#F5F1EA]/40'}`}>
                {index + 1 < step ? <Check size={14} /> : index + 1}
              </div>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#F5F1EA]/50">{label}</span>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#121212] p-4 shadow-2xl shadow-black/20 md:p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#F5F1EA]/60">Carregando agendamento...</div>
          ) : (
            <>
              {step === 1 && (
                <section>
                  <div className="mb-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Etapa 1</p>
                    <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Qual serviço você quer?</h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {services.map((service) => (
                      <button key={service.id} type="button" onClick={() => { setSelection((current) => ({ ...current, service })); setStep(2); }} className="rounded-[24px] border border-white/10 bg-[#0F0F0F] p-4 text-left transition-all hover:border-[#4FE7FF]/60">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0E1417] text-[#4FE7FF]"><Scissors size={18} /></div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5F1EA]/50">{service.duracao_minutos} min</span>
                        </div>
                        <h3 className="text-xl font-semibold">{service.nome}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#F5F1EA]/60">{service.descricao || 'Atendimento premium com acabamento impecável.'}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xl font-bold">{formatCurrency(service.preco)}</span>
                          <span className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]">Selecionar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section>
                  <div className="mb-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Etapa 2</p>
                    <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Escolha seu horário</h2>
                  </div>

                  <div className="mb-5 grid gap-3 md:grid-cols-5">
                    {nextDates.map((date) => (
                      <button key={date} type="button" onClick={() => setSelection((current) => ({ ...current, date, time: '' }))} className={`rounded-2xl border px-3 py-3 text-left transition-all ${selection.date === date ? 'border-[#4FE7FF] bg-[#162127]' : 'border-white/10 bg-[#0F0F0F]'}`}>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-[#F5F1EA]/50">{new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}</div>
                        <div className="mt-2 text-sm font-semibold">{new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      </button>
                    ))}
                  </div>

                  {selection.date && (
                    <div className="rounded-[24px] border border-white/10 bg-[#0F0F0F] p-4">
                      <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-[#F5F1EA]/70">
                        <CalendarDays size={16} className="text-[#4FE7FF]" />
                        <span>Horários disponíveis</span>
                      </div>

                      <TimeSlotPicker
                        value={selection.time}
                        onChange={(time) => {
                          setSelection((current) => ({ ...current, time }));
                          setStep(3);
                        }}
                        disabledTimes={['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].filter((slot) => !availableTimes.includes(slot))}
                        startHour={9}
                        endHour={17}
                        intervalMinutes={30}
                        className="max-w-full"
                      />
                    </div>
                  )}
                </section>
              )}

              {step === 3 && (
                <section>
                  <div className="mb-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Etapa 3</p>
                    <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Quase lá.</h2>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-medium text-[#F5F1EA]/70">
                      Nome
                      <input value={selection.clientName} onChange={(event) => setSelection((current) => ({ ...current, clientName: event.target.value }))} placeholder="Seu nome" className="rounded-2xl border border-white/10 bg-[#0F0F0F] px-4 py-3 text-base text-white placeholder:text-[#F5F1EA]/30" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-[#F5F1EA]/70">
                      WhatsApp
                      <input value={selection.clientPhone} onChange={(event) => setSelection((current) => ({ ...current, clientPhone: event.target.value }))} placeholder="(11) 99999-9999" className="rounded-2xl border border-white/10 bg-[#0F0F0F] px-4 py-3 text-base text-white placeholder:text-[#F5F1EA]/30" />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-[#F5F1EA]/70">
                      Observação (opcional)
                      <textarea value={selection.notes} onChange={(event) => setSelection((current) => ({ ...current, notes: event.target.value }))} placeholder="Alguma preferência ou detalhe que queira nos passar?" className="min-h-[110px] rounded-2xl border border-white/10 bg-[#0F0F0F] px-4 py-3 text-base text-white placeholder:text-[#F5F1EA]/30" />
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button type="button" onClick={goNext} disabled={!canContinue()} className="w-full md:w-auto">Continuar</Button>
                  </div>
                </section>
              )}

              {step === 4 && (
                <section>
                  <div className="mb-6 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4FE7FF]">Etapa 4</p>
                    <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Quer aproveitar e levar junto?</h2>
                  </div>

                  <div className="mb-6 rounded-[24px] border border-white/10 bg-[#0F0F0F] p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-[#F5F1EA]/70"><span>{selection.professional?.name}</span><strong>{selection.service?.nome}</strong></div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#F5F1EA]/70"><span>{selection.date}</span><strong>{selection.time}</strong></div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm text-[#F5F1EA]/70"><span>Total</span><strong className="text-lg text-white">{formatCurrency(total)}</strong></div>
                  </div>

                  <button type="button" onClick={() => setSelection((current) => ({ ...current, bumpSelected: !current.bumpSelected }))} className={`flex w-full items-center justify-between gap-4 rounded-[24px] border p-4 text-left transition-all ${selection.bumpSelected ? 'border-[#4FE7FF] bg-[#162127]' : 'border-white/10 bg-[#0F0F0F]'}`}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4FE7FF]">Oferta especial</p>
                      <h3 className="mt-2 text-xl font-semibold">{bumpProduct.nome}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-[#F5F1EA]/40 line-through">{formatCurrency(bumpProduct.preco_original)}</div>
                      <div className="text-lg font-bold">{formatCurrency(bumpProduct.preco_bump)}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">{selection.bumpSelected ? <Check size={18} /> : <Plus size={18} />}</div>
                  </button>

                  <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-end">
                    <Button type="button" variant="secondary" onClick={() => setSelection((current) => ({ ...current, bumpSelected: false }))} className="w-full md:w-auto">Sem oferta</Button>
                    <Button type="button" onClick={handleConfirm} disabled={submitting} className="w-full md:w-auto">{submitting ? 'Confirmando...' : 'Confirmar agendamento'}</Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
