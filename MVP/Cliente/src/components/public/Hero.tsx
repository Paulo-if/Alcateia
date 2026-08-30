import { CalendarCheck, MapPin, Scissors } from 'lucide-react';
import logo from '../../assets/LogoAlcateia.jpg';
import { ActionCard } from './ActionCard';
import { HeroCarousel } from './HeroCarousel';

interface Props {
  brand: string;
  onOpenBooking: () => void;
  onOpenAbout: () => void;
  onOpenLocation: () => void;
}

export function Hero({ brand, onOpenBooking, onOpenAbout, onOpenLocation }: Props) {
  return (
    <section className="hero">
      <HeroCarousel />

      <div className="hero-logo-wrap">
        <img className="hero-logo" src={logo} alt="Logo Alcateia Barber" />
      </div>

      <div className="hero-inner">
        <p className="hero-badge">{brand}</p>

        <h1 className="hero-title">A Arte do Corte Clássico.</h1>

        <p className="hero-sub">
          Precisão, silêncio e tempo bem gasto. Escolha o serviço, o dia e a hora — sem ligações,
          sem esperas.
        </p>

        <div className="action-cards">
          <ActionCard
            icon={<CalendarCheck size={34} />}
            title="Agendamentos"
            subtitle="Reserve seu horário"
            onClick={onOpenBooking}
          />
          <ActionCard
            icon={<Scissors size={34} />}
            title="Conheça nossa barbearia"
            subtitle="A história por trás da tesoura"
            onClick={onOpenAbout}
          />
          <ActionCard
            icon={<MapPin size={34} />}
            title="Localização"
            subtitle="Como chegar até nós"
            onClick={onOpenLocation}
          />
        </div>
      </div>
    </section>
  );
}