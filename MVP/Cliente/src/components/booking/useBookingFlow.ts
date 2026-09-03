import { useCallback, useState } from 'react';
import type { PaymentMethod, Service } from '../../types';

export type BookingStep =
  | 'service'
  | 'professional'
  | 'date'
  | 'time'
  | 'customer'
  | 'bump'
  | 'payment'
  | 'confirmation';

export interface BookingSelection {
  service: Service | null;
  professionalId: string | 'any' | null;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  observations: string;
  bumpSelected: boolean;
  paymentMethod: PaymentMethod | null;
}

export function useBookingFlow() {
  const [step, setStep] = useState<BookingStep>('service');
  const [selection, setSelection] = useState<BookingSelection>({
    service: null,
    professionalId: null,
    date: '',
    time: '',
    clientName: '',
    clientPhone: '',
    observations: '',
    bumpSelected: false,
    paymentMethod: null,
  });

  const set = useCallback(
    (patch: Partial<BookingSelection>) => setSelection((prev) => ({ ...prev, ...patch })),
    [],
  );

  const reset = useCallback(() => {
    setSelection({
      service: null,
      professionalId: null,
      date: '',
      time: '',
      clientName: '',
      clientPhone: '',
      observations: '',
      bumpSelected: false,
      paymentMethod: null,
    });
    setStep('service');
  }, []);

  return {
    step,
    setStep,
    selection,
    set,
    reset,
  };
}

export type BookingFlowController = ReturnType<typeof useBookingFlow>;