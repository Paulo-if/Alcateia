import { useEffect, useMemo, useRef, useState } from 'react';
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
import { UpsellCard } from './UpsellCard';
import { ConfirmationCard } from './ConfirmationCard';

import { fetchProfessionals } from '../../services/professionalsService';
import { fetchServices } from '../../services/servicesService';
import { fetchBumpProducts } from '../../services/productsService';
import { findOrCreateCustomer } from '../../services/customersService';
import { createBooking, addUpsellSale } from '../../services/bookingsService';
import { createOnlineCheckout } from '../../services/paymentService';
import { fetchSettings } from '../../services/settingsService';

import { useAvailability } from '../../hooks/useAvailability';
import { useAsyncLock } from '../../hooks/useAsyncLock';
import { getAvailableSlots } from '../../services/availabilityService';

import type { BumpOffer, Professional, Service, UpsellOffer } from '../../types';
import type { PublicSettings } from '../../config';
import { defaultPublicSettings } from '../../config';
import { DEV_UPSELL } from '../../data/devFallback';
import { getNextDates } from '../../lib/date';
import { isConflictError } from '../../services/errors';

const STEP_TITLES: Record<BookingStep, { eyebrow: string; title: string }> = {
  service: { eyebrow: 'Agendamento', title: 'Qual serviço você quer?' },
  professional: { eyebrow: 'Agendamento', title: 'Quem vai cuidar do seu corte?' },
  date: { eyebrow: 'Agendamento', title: 'Escolha a data' },
  time: { eyebrow: 'Agendamento', title: 'Escolha seu horário' },
  customer: { eyebrow: 'Agendamento', title: 'Quase lá. Cadastre seus dados' },
  summary: { eyebrow: 'Revisão', title: 'Confira o resumo' },
  bump: { eyebrow: 'Revisão', title: 'Quer aproveitar e levar junto?' },
  payment: { eyebrow: 'Pagamento', title: 'Como deseja pagar?' },
  upsell: { eyebrow: 'Confirmação', title: 'Aproveite enquanto está aqui.' },
  confirmation: { eyebrow: '', title: '' },
};

const NEXT_STEP: Record<BookingStep, BookingStep | null> = {
  service: 'professional',
  professional: 'date',
  date: 'time',
  time: 'customer',
  customer: 'summary',
  summary: 'bump',
  bump: 'payment',
  payment: 'upsell',
  upsell: 'confirmation',
  confirmation: null,
};

const BACK_TO: Record<BookingStep, BookingStep | null> = {
  service: null,
  professional: 'service',
  date: 'professional',
  time: 'date',
  customer: 'time',
  summary: 'customer',
  bump: 'summary',
  payment: 'bump',
  upsell: null,
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

  const [upsellOffers, setUpsellOffers] = useState<UpsellOffer[]>([]);
  const [bookingResult, setBookingResult] = useState<{ id: string; paymentStatus: string } | null>(null);
  const [assignedProfessional, setAssignedProfessional] = useState<Professional | null>(null);

  const [todayHasSlots, setTodayHasSlots] = useState<boolean | null>(null);
  const [checkingToday, setCheckingToday] = useState(false);
  const todayCheckedRef = useRef(false);

  const submitLock = useAsyncLock();

  const dates = useMemo(() => getNextDates(7), []);
  const todayStr = dates[0];

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
          bumpProducts.map((p) => ({
            type: 'product',
            product: p,
            name: p.nome,
            description: p.descricao,
            price: p.preco_bump,
            originalPrice: p.preco_original,
            additionalMinutes: 0,
            imageUrl: p.imagem_url,
          })),
        );
        setSettings(settingsData);
        setUpsellOffers(DEV_UPSELL);
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

  // Ao entrar na etapa de data: verifica se "hoje" tem disponibilidade real.
  // Se tiver, seleciona HOJE por padrão; senão mantém "hoje" visível mas sem horários.
  useEffect(() => {
    todayCheckedRef.current = false;
    setTodayHasSlots(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.service, selection.professionalId]);

  useEffect(() => {
    if (step !== 'date') return;
    if (todayCheckedRef.current) return;
    if (!selection.service || !selection.professionalId) return;

    todayCheckedRef.current = true;
    setCheckingToday(true);

    getAvailableSlots({
      dateString: todayStr,
      service: selection.service,
      professionalId: selection.professionalId,
      professionals,
      extraMinutes: effectiveExtraMinutes,
    })
      .then((todaySlots) => {
        setTodayHasSlots(todaySlots.length > 0);
        if (todaySlots.length > 0 && !selection.date) {
          set({ date: todayStr, time: '' });
        }
      })
      .catch(() => setTodayHasSlots(false))
      .finally(() => setCheckingToday(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selection.service, selection.professionalId]);

  const scrollBodyTop = () => {
    document.querySelector('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const next = NEXT_STEP[step];
    if (next) setStep(next);
    scrollBodyTop();
  };

  const goBack = () => {
    const prev = BACK_TO[step];
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
    step === 'summary' ||
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

  const handleUpsellAdd = async (offer: UpsellOffer) => {
    if (bookingResult) {
      await submitLock.run(() => addUpsellSale({ agendamentoId: bookingResult.id, offer }));
    }
    goNext();
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
                  dates={dates}
                  selectedDate={selection.date}
                  todayHasSlots={todayHasSlots}
                  checkingToday={checkingToday}
                  onSelect={(date) => {
                    set({ date, time: '' });
                    setAssignedProfessional(null);
                    goNext();
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

              {step === 'summary' && (
                <BookingSummary
                  professional={effectiveProfessional}
                  service={selection.service}
                  date={selection.date}
                  time={selection.time}
                  subtotal={prices.servicePrice}
                  bumpAmount={0}
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

              {step === 'upsell' && (
                <UpsellCard
                  offer={upsellOffers[0] ?? null}
                  onAdd={handleUpsellAdd}
                  onSkip={goNext}
                  adding={submitLock.loading}
                />
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