import { ArrowLeft, CalendarDays, CheckCircle2, MessageCircle } from 'lucide-react';
import type { Professional, Service } from '../../types';
import { addMinutesToTime, formatCurrency, formatDateBR } from '../../lib/date';
import type { PublicSettings } from '../../config';

interface ConfirmationData {
  professional: Professional | null;
  service: Service | null;
  date: string;
  time: string;
  total: number;
  customerName: string;
  bumpMinutes: number;
  paymentMethod: string;
  paymentStatus: string;
  bookingId: string;
  anyProfessionalMode: boolean;
}

interface Props {
  data: ConfirmationData;
  settings: PublicSettings;
  onNewBooking: () => void;
}

export function ConfirmationCard({ data, settings, onNewBooking }: Props) {
  const { professional, service, date, time, total, customerName, bumpMinutes, paymentMethod, paymentStatus } = data;

  const whatsappNumber = settings.whatsapp.replace(/\D/g, '');

  const professionalLabel = data.anyProfessionalMode ? 'Qualquer profissional' : (professional?.name ?? '—');
  const assignedProfessional = professional?.name;

  const whatsappMessage = encodeURIComponent(
    `Olá! Meu agendamento na ${settings.nome} foi confirmado.\n\n` +
      `Profissional: ${assignedProfessional ?? professionalLabel}\n` +
      `Serviço: ${service?.nome ?? ''}\n` +
      `Data: ${formatDateBR(date)}\n` +
      `Horário: ${time}\n` +
      `Total: ${formatCurrency(total)}\n` +
      (paymentMethod === 'in_person' ? `Pagamento: no local\n` : `Pagamento: online\n`),
  );

  const emailEndMinutes = (service?.duracao_minutos ?? 0) + bumpMinutes;
  const emailEndTime = addMinutesToTime(time, emailEndMinutes);
  const formatGoogleDate = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`;

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${assignedProfessional ?? professionalLabel} - ${service?.nome ?? ''}`,
  )}&details=${encodeURIComponent(
    `Agendamento ${settings.nome}\nCliente: ${customerName}\nTotal: ${formatCurrency(total)}\nPagamento: ${paymentMethod === 'in_person' ? 'no local' : 'online'}`,
  )}&location=${encodeURIComponent(settings.endereco)}&dates=${formatGoogleDate(date, time)}/${formatGoogleDate(date, emailEndTime)}`;

  return (
    <div className="confirm-card">
      <div className="confirm-check">
        <CheckCircle2 size={38} />
      </div>

      <div>
        <p className="eyebrow">Confirmado</p>
        <h2 style={{ marginTop: 8 }}>Agendamento confirmado</h2>
      </div>

      {paymentMethod === 'online' && paymentStatus === 'pending' && (
        <p className="confirm-message">
          Sua reserva está garantida aguardando a confirmação do pagamento online.
        </p>
      )}
      {paymentMethod === 'online' && paymentStatus === 'paid' && (
        <p className="confirm-message">Pagamento aprovado. Reserva confirmada.</p>
      )}
      {paymentMethod === 'in_person' && (
        <p className="confirm-message">Reserva criada. O pagamento será feito no local.</p>
      )}

      <div className="confirm-details">
        <div><span>Profissional</span><strong>{assignedProfessional ?? professionalLabel}</strong></div>
        <div><span>Serviço</span><strong>{service?.nome}</strong></div>
        <div><span>Data</span><strong>{formatDateBR(date)}</strong></div>
        <div><span>Horário</span><strong>{time}</strong></div>
        <div><span>Total</span><strong>{formatCurrency(total)}</strong></div>
        <div><span>Pagamento</span><strong>{paymentMethod === 'in_person' ? 'No local' : 'Online'}</strong></div>
      </div>

      <div className="confirm-actions">
        {whatsappNumber ? (
          <a
            className="btn btn-whatsapp btn-block btn-lg"
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            Confirmar pelo WhatsApp
          </a>
        ) : (
          <span className="btn btn-secondary btn-block disabled-hint">
            Configure o WhatsApp da barbearia para enviar a confirmação.
          </span>
        )}

        <a className="btn btn-secondary btn-block" href={googleCalendarUrl} target="_blank" rel="noreferrer">
          <CalendarDays size={18} />
          Adicionar à agenda
        </a>
      </div>

      <button type="button" className="confirm-new" onClick={onNewBooking}>
        <ArrowLeft size={14} />
        Fazer novo agendamento
      </button>
    </div>
  );
}