import { useEffect, useState } from 'react';
import { getAvailableSlots } from '../services/availabilityService';
import type { AvailableSlot } from '../services/availabilityService';
import type { Professional, Service } from '../types';

/**
 * Carrega horários disponíveis para um serviço/data, respeitando a seleção
 * de profissional (ou "qualquer profissional") e a duração total do serviço.
 */
export function useAvailability(params: {
  dateString: string;
  service: Service | null;
  professionalId: string | 'any' | null;
  professionals: Professional[];
  extraMinutes?: number;
}) {
  const { dateString, service, professionalId, professionals, extraMinutes = 0 } = params;
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!service || !professionalId || !dateString) {
      setSlots([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getAvailableSlots({
      dateString,
      service,
      professionalId,
      professionals,
      extraMinutes,
    })
      .then((result) => {
        if (!active) return;
        setSlots(result);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Erro ao carregar horários.';
        setSlots([]);
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dateString, service, professionalId, professionals, extraMinutes]);

  return { slots, loading, error };
}
