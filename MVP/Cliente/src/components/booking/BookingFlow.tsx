import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useBookingFlow, type BookingStep } from './useBookingFlow';
import { BookingProgress } from './BookingProgress';
import { ServiceSelector } from './ServiceSelector';
import { ProfessionalSelector } from './ProfessionalSelector';
import { DateSelector } from './DateSelector';
import { TimeSlotPicker } from './TimeSlotPicker';
import { CustomerForm } from './CustomerForm';
import { BookingSummary } from './BookingSummary';
import { OrderBumpCard } from './OrderBumpCard';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { ConfirmationCard } from './ConfirmationCard';

import { fetchProfessionals } from '../../services/professionalsService';
import { fetchServices } from '../../services/servicesService';
import { fetchBumpProducts } from '../../services/productsService';
import { findOrCreateCustomer } from '../../services/customersService';
import { createBooking } from '../../services/bookingsService';
import { createOnlineCheckout } from '../../services/paymentService';
import { fetchSettings } from '../../services/settingsService';

import { useAvailability } from '../../hooks/useAvailability';
import { useDateAvailability } from '../../hooks/useDateAvailability';
import { useAsyncLock } from '../../hooks/useAsyncLock';

import type { BumpOffer, Professional, Service } from '../../types';
import type { PublicSettings } from '../../config';
import { defaultPublicSettings } from '../../config';
import { formatDateInput, today } from '../../lib/date';
import { isConflictError } from '../../services/errors';

const STEP_TITLES: Record<BookingStep, { eyebrow: string; title: string }> = {
  service: { eyebrow: 'Agendamento', title: 'Qual serviço você quer?' },
  professional: { eyebrow: 'Agendamento', title: 'Quem vai cuidar do seu corte?' },
  date: { eyebrow: 'Agendamento', title: 'Escolha a data' },
  time: { eyebrow: 'Agendamento', title: 'Escolha seu horário' },
  customer: { eyebrow: 'Agendamento', title: 'Quase lá. Cadastre seus dados' },
  bump: { eyebrow: 'Revisão', title: 'Quer aproveitar e levar junto?' },
  payment: { eyebrow: 'Pagamento', title: 'Como deseja pagar?' },
  confirmation: { eyebrow: '', title: '' },
};

const NEXT_STEP: Record<BookingStep, BookingStep | null> = {
  service: 'professional',
  professional: 'date',
  date: 'time',
  time: 'customer',
  customer: 'bump',
  bump: 'payment',
  payment: 'confirmation',
  confirmation: null,
};

const BACK_TO: Record<BookingStep, BookingStep | null> = {
  service: null,
  professional: 'service',
  date: 'professional',
  time: 'date',
  customer: 'time',
  bump: 'customer',
  payment: 'bump',
  confirmation: null,
};

export function BookingFlow() {
  const flow = useBookingFlow();
  const { step, setStep, selection, set } = flow;

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bumps, setBumps] = useState<BumpOffer[]>([]);
  const [selectedBump, setSelectedBump] = useState<BumpOffer | null>(null);
  const [settings, setSettings] = useState<PublicSettings>(defaultPublicSettings);

  const [bookingResult, setBookingResult] = useState<{ id: string; paymentStatus: string } | null>(null);
  const [assignedProfessional, setAssignedProfessional] = useState<Professional | null>(null);

  const submitLock = useAsyncLock();

  const todayStr = formatDateInput(today());

  const prices = useMemo(() => {
    const servicePrice = selection.service?.preco ?? 0;
    const bumpPrice = selection.bumpSelected && selectedBump ? selectedBump.price : 0;
    return { servicePrice, bumpPrice, total: servicePrice + bumpPrice };
  }, [selection.service, selection.bumpSelected, selectedBump]);

  const effectiveExtraMinutes =
    selection.bumpSelected && selectedBump?.type === 'micro_service' ? selectedBump.additionalMinutes : 0;

  const { slots, loading: availabilityLoading, error: availabilityError } = useAvailability({
    dateString: selection.date,
    service: selection.service,
    professionalId: selection.professionalId,
    professionals,
    extraMinutes: effectiveExtraMinutes,
  });

  const {
    availableDates,
    todayAvailable,
    ranges,
  } = useDateAvailability({
    service: selection.service,
    professionalId: selection.professionalId,
    professionals,
    extraMinutes: effectiveExtraMinutes,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profs, svc, bumpProducts, settingsData] = await Promise.all([
          fetchProfessionals(),
          fetchServices(),
          fetchBumpProducts().catch(() => []),
          fetchSettings(),
        ]);
        if (!active) return;
        setProfessionals(profs);
        setServices(svc);
        setBumps(
          bumpProducts
            .map((p) => ({
              type: 'product' as const,
              product: p,
              name: p.nome,
              description: p.descricao,
              price: p.preco_bump,
              originalPrice: p.preco_original,
              additionalMinutes: 0,
              imageUrl: p.imagem_url,
            }))
            // Opção B: no fluxo público, exibimos apenas ofertas que NÃO alteram
            // a duração (produtos físicos, additionalMinutes = 0).
            //
            // Motivo: o Order Bump é escolhido DEPOIS do horário, e a
            // disponibilidade da grade usa apenas o tempo do serviço base
            // (extraMinutes = 0 na etapa de horário). Uma oferta do tipo
            // micro-serviço (additionalMinutes > 0) faria o agendamento discordar
            // da disponibilidade e esbarraria na constraint GiST (23P01).
            // Para garantir a invariante "disponibilidade === booking (mesma
            // duração)" sem refatorar o motor do calendário, mantemos zero ofertas
            // com duração adicional no fluxo público.
            .filter((o) => o.additionalMinutes <= 0),
        );
        setSettings(settingsData);
      } catch {
        if (!active) return;
        setLoadError('Não foi possível carregar os agendamentos agora. Tente novamente em alguns instantes.');
      } finally {
        if (active) setLoadingInitial(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedProfessional = useMemo(
    () =>
      selection.professionalId && selection.professionalId !== 'any'
        ? professionals.find((p) => p.id === selection.professionalId) ?? null
        : null,
    [selection.professionalId, professionals],
  );

  const effectiveProfessional =
    assignedProfessional?.id ? assignedProfessional : selectedProfessional;

  const anyProfessionalMode = selection.professionalId === 'any';

  // Ao entrar na etapa de data: se HOJE tem horários disponíveis (mesma camada
  // de disponibilidade), já o seleciona por padrão. Se HOJE estiver bloqueado
  // (folga/férias, dia sem expediente), o destaque fica visível mas indisponível.
  useEffect(() => {
    if (todayAvailable !== true || !selection.service || !selection.professionalId) return;
    if (selection.date) return;
    set({ date: todayStr, time: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayAvailable, selection.service, selection.professionalId, selection.date]);

  const scrollBodyTop = () => {
    document.querySelector('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pule a etapa de Order Bump quando não houver ofertas ativas: o cliente
  // vai direto dos dados para o pagamento.
  const hasActiveBumps = bumps.length > 0;

  const goNext = () => {
    const base = NEXT_STEP[step];
    // Ao sair dos dados do cliente, se não houver bumps, seguir direto ao pagamento.
    const next = step === 'customer' && !hasActiveBumps ? 'payment' : base;
    if (next) setStep(next);
    scrollBodyTop();
  };

  const goBack = () => {
    // Ao voltar do pagamento, se não havia bumps, voltar aos dados.
    let prev = BACK_TO[step];
    if (step === 'payment' && !hasActiveBumps) prev = 'customer';
    if (prev) setStep(prev);
    scrollBodyTop();
  };

  const canContinue = (): boolean => {
    if (step === 'service') return Boolean(selection.service);
    if (step === 'professional') return Boolean(selection.professionalId);
    if (step === 'date') return Boolean(selection.date);
    if (step === 'time') return Boolean(selection.time);
    if (step === 'customer') return selection.clientName.trim().length > 0 && selection.clientPhone.trim().length > 0;
    if (step === 'payment') return Boolean(selection.paymentMethod);
    return true;
  };

  const showFooter =
    step === 'service' ||
    step === 'professional' ||
    step === 'date' ||
    step === 'time' ||
    step === 'customer' ||
    step === 'payment';

  const primaryLabel = (): string => {
    if (step === 'payment' && submitLock.loading) {
      return selection.paymentMethod === 'online' ? 'Iniciando checkout...' : 'Confirmando reserva...';
    }
    if (step === 'payment') return 'Confirmar agendamento';
    return 'Continuar';
  };

  const onPrimary = () => {
    if (!canContinue()) return;
    if (step === 'payment') {
      handlePaymentContinue();
      return;
    }
    goNext();
  };

  const submitAction = async (): Promise<void> => {
    if (step !== 'payment' || !selection.service || !selection.date || !selection.time || !selection.paymentMethod) {
      return;
    }

    const paymentMethod = selection.paymentMethod;
    const customer = await findOrCreateCustomer({
      nome: selection.clientName,
      telefone: selection.clientPhone,
    });

    const idempotencyKey = `${selection.date}-${selection.time}-${selection.professionalId ?? 'any'}-${customer.id
      .replace(/\D/g, '')
      .slice(-8)}`;

    let result;
    try {
      result = await createBooking({
        cliente: customer,
        servico: selection.service,
        professional: effectiveProfessional,
        dateString: selection.date,
        time: selection.time,
        observations: selection.observations.trim() || null,
        bump: selection.bumpSelected ? selectedBump : null,
        paymentMethod,
        idempotencyKey,
      });
    } catch (err) {
      if (isConflictError(err)) {
        throw new Error('Este horário acabou de ser reservado. Escolha outro.');
      }
      throw err;
    }

    if (paymentMethod === 'online') {
      try {
        await createOnlineCheckout({
          booking: result.booking,
          customerName: selection.clientName,
          customerPhone: selection.clientPhone,
          amount: prices.total,
        });
      } catch (e) {
        console.warn('Checkout online aguardando configuração:', e);
      }
    }

    setBookingResult({ id: result.booking.id, paymentStatus: result.booking.payment_status ?? 'pending' });
    setAssignedProfessional(effectiveProfessional);
    goNext();
  };

  const handlePaymentContinue = async () => {
    try {
      await submitLock.run(submitAction);
    } catch {
      // Erro já é comunicado à UI via submitLock.error (mensagem amigável de conflito incluída).
    }
  };

  // ==================== RENDER ====================

  if (loadingInitial) {
    return (
      <div className="flow-loading">
        <span className="spinner" aria-hidden="true" />
        Carregando agendamento...
      </div>
    );
  }

  if (loadError && services.length === 0) {
    return (
      <div className="step">
        <div className="alert error" role="alert">
          {loadError}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const stepTitle = STEP_TITLES[step];

  return (
    <>
      <div className="flow-body">
        {loadError && <div className="alert error" role="alert">{loadError}</div>}

        {step === 'confirmation' ? (
          <ConfirmationCard
            data={{
              professional: effectiveProfessional,
              service: selection.service,
              date: selection.date,
              time: selection.time,
              total: prices.total,
              customerName: selection.clientName,
              bumpMinutes: selection.bumpSelected && selectedBump ? selectedBump.additionalMinutes : 0,
              paymentMethod: selection.paymentMethod ?? 'in_person',
              paymentStatus: bookingResult?.paymentStatus ?? 'pending',
              bookingId: bookingResult?.id ?? '',
              anyProfessionalMode,
            }}
            settings={settings}
            onNewBooking={() => {
              flow.reset();
              setBookingResult(null);
              setAssignedProfessional(null);
              setSelectedBump(null);
              scrollBodyTop();
            }}
          />
        ) : (
          <>
            <BookingProgress current={step} />

            <div className="step-head">
              <p className="eyebrow">{stepTitle.eyebrow}</p>
              <h2>{stepTitle.title}</h2>
            </div>

            <div key={step} className="step">
              {step === 'service' && (
                <ServiceSelector
                  services={services}
                  selectedServiceId={selection.service?.id ?? null}
                  loading={loadingInitial}
                  onSelect={(service) => {
                    set({ service });
                    goNext();
                  }}
                />
              )}

              {step === 'professional' && (
                <ProfessionalSelector
                  professionals={professionals}
                  selectedId={selection.professionalId}
                  onSelect={(id) => {
                    set({ professionalId: id, date: '', time: '' });
                    setAssignedProfessional(null);
                    goNext();
                  }}
                />
              )}

              {step === 'date' && (
                <DateSelector
                  today={todayStr}
                  dates={availableDates}
                  selectedDate={selection.date}
                  todayAvailable={todayAvailable}
                  ranges={ranges}
                  onSelect={(date) => {
                    set({ date, time: '' });
                    setAssignedProfessional(null);
                    goNext();
                  }}
                  availabilityParams={{
                    service: selection.service,
                    professionalId: selection.professionalId,
                    professionals,
                    extraMinutes: effectiveExtraMinutes,
                  }}
                />
              )}

              {step === 'time' && (
                <TimeSlotPicker
                  slots={slots}
                  professionals={professionals}
                  value={selection.time}
                  anyProfessionalMode={anyProfessionalMode}
                  loading={availabilityLoading}
                  error={availabilityError}
                  onSelect={(slot) => {
                    set({ time: slot.time });
                    if (slot.professionalId && slot.professionalId !== 'any') {
                      setAssignedProfessional(professionals.find((p) => p.id === slot.professionalId) ?? null);
                    }
                    goNext();
                  }}
                />
              )}

              {step === 'customer' && (
                <CustomerForm
                  clientName={selection.clientName}
                  clientPhone={selection.clientPhone}
                  onChange={(patch) => set(patch)}
                  showError={submitLock.error}
                />
              )}

              {step === 'bump' && (
                <OrderBumpCard
                  offers={bumps}
                  onAccept={(offer) => {
                    setSelectedBump(offer);
                    set({ bumpSelected: true });
                    goNext();
                  }}
                  onDecline={() => {
                    setSelectedBump(null);
                    set({ bumpSelected: false });
                    goNext();
                  }}
                />
              )}

              {step === 'payment' && (
                <>
                  <BookingSummary
                    professional={effectiveProfessional}
                    service={selection.service}
                    date={selection.date}
                    time={selection.time}
                    subtotal={prices.servicePrice}
                    bumpAmount={prices.bumpPrice}
                    bumpMinutes={
                      selection.bumpSelected && selectedBump && selectedBump.type === 'micro_service'
                        ? selectedBump.additionalMinutes
                        : 0
                    }
                  />
                  <div style={{ height: 16 }} />
                  <PaymentMethodSelector
                    value={selection.paymentMethod}
                    onChange={(method) => set({ paymentMethod: method })}
                    disabled={submitLock.loading}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showFooter && (
        <div className="sheet-footer">
          {submitLock.error && <div className="alert error inline-alert" role="alert">{submitLock.error}</div>}
          <div className="flow-actions">
            {BACK_TO[step] && (
              <button type="button" className="btn btn-ghost" onClick={goBack}>
                <ArrowLeft size={18} />
                Voltar
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary grow"
              onClick={onPrimary}
              disabled={!canContinue() || submitLock.loading}
            >
              {primaryLabel()}
            </button>
          </div>
        </div>
      )}
    </>
  );
}