import { useEffect, useState } from 'react';
import { type Professional, type Service } from '../types';
import {
  type UnavailableRange,
  dateHasAvailability,
  fetchUnavailableRanges,
} from '../services/availabilityService';
import { getNextDates } from '../lib/date';

const MAX_AVAILABLE_DATES = 8;
// Janela de busca: avalia até 45 dias futuros para encontrar as 8 próximas datas
// realmente disponíveis (pula folgas/férias/dias sem expediente/agendamentos).
const HORIZON_DAYS = 45;

interface UseDateAvailabilityParams {
  service: Service | null;
  professionalId: string | 'any' | null;
  professionals: Professional[];
  extraMinutes?: number;
}

interface UseDateAvailabilityResult {
  availableDates: string[];
  loadingDates: boolean;
  todayAvailable: boolean | null;
  ranges: UnavailableRange[];
}

/**
 * Calcula as próximas datas realmente disponíveis para o serviço/profissional
 * selecionado, usando a camada de disponibilidade como fonte de verdade.
 *
 * - Folgas/férias (professional_time_off) tornam dias indisponíveis;
 * - "Qualquer profissional" considera um dia disponível se houver ao menos um
 *   barbeiro elegível naquela data;
 * - Retorna também os intervalos de indisponibilidade (para avisos visuais).
 */
export function useDateAvailability({
  service,
  professionalId,
  professionals,
  extraMinutes = 0,
}: UseDateAvailabilityParams): UseDateAvailabilityResult {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [todayAvailable, setTodayAvailable] = useState<boolean | null>(null);
  const [ranges, setRanges] = useState<UnavailableRange[]>([]);

  useEffect(() => {
    let active = true;

    if (!service || !professionalId) {
      setAvailableDates([]);
      setTodayAvailable(null);
      setRanges([]);
      return;
    }

    setLoadingDates(true);

    const candidates = getNextDates(HORIZON_DAYS);
    const params = { service, professionalId, professionals, extraMinutes };

    fetchUnavailableRanges(professionalId)
      .then((r) => {
        if (active) setRanges(r);
      })
      .catch(() => {
        if (active) setRanges([]);
      });

    (async () => {
      const collected: string[] = [];
      let todayFlag: boolean | null = null;

      for (const dateString of candidates) {
        if (!active) return;
        let hasSlots: boolean;
        try {
          hasSlots = await dateHasAvailability(dateString, params);
        } catch {
          hasSlots = false;
        }
        if (collected.length === 0 && todayFlag === null) {
          // Primeira candidata = hoje; registra sua disponibilidade em separado
          // para o destaque "Hoje" da UI.
          todayFlag = hasSlots;
        }
        if (hasSlots) {
          collected.push(dateString);
          if (collected.length >= MAX_AVAILABLE_DATES) break;
        }
      }

      if (!active) return;
      setTodayAvailable(todayFlag ?? false);
      setAvailableDates(collected);
      setLoadingDates(false);
    })();

    return () => {
      active = false;
    };
  }, [service, professionalId, professionals, extraMinutes]);

  return { availableDates, loadingDates, todayAvailable, ranges };
}
