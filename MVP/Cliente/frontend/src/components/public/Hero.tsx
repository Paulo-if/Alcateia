import logo from '../../assets/LogoAlcateia.jpg';
import { ActionCard } from './ActionCard';
import { HeroCarousel } from './HeroCarousel';

interface Props {
  onOpenBooking: () => void;
  onOpenAbout: () => void;
  onOpenProducts: () => void;
}

export function Hero({ onOpenBooking, onOpenAbout, onOpenProducts }: Props) {
  return (
    <section className="hero">
      <HeroCarousel />

      <div className="hero-logo-wrap">
        <img className="hero-logo" src={logo} alt="Logo Alcateia Barbearia" />
      </div>

      <div className="hero-inner">
        <h1 className="hero-title">Alcateia Barbearia</h1>

        <p className="hero-sub">Liberte sua juventude</p>

        <div className="action-cards">
          <ActionCard
            title="Agendamentos"
            subtitle="Reserve seu horário"
            onClick={onOpenBooking}
          />
          <ActionCard
            title="Conheça nossa barbearia"
            subtitle="A história por trás da tesoura"
            onClick={onOpenAbout}
          />
          <ActionCard
            title="Produtos"
            subtitle="Conheça nossos produtos"
            onClick={onOpenProducts}
          />
        </div>
      </div>
    </section>
  );
}