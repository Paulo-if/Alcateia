import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from './Hero';
import { LocationMap } from './LocationMap';
import { PublicFooter } from './PublicFooter';
import { BookingSheet } from '../booking/BookingSheet';
import { BookingFlow } from '../booking/BookingFlow';
import { fetchSettings } from '../../services/settingsService';
import type { PublicSettings } from '../../config';
import { defaultPublicSettings } from '../../config';

export function PublicHome() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PublicSettings>(defaultPublicSettings);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((stgs) => {
        if (active) setSettings(stgs);
      })
      .catch(() => {
        if (active) setSettings(defaultPublicSettings);
      });
    return () => {
      active = false;
    };
  }, []);

  const scrollToLocation = () => {
    document.getElementById('localizacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=Alcateia+Barbearia';

  return (
    <div className="public-shell">
      <Hero
        brand={settings.nome}
        onOpenBooking={() => setBookingOpen(true)}
        onOpenAbout={() => navigate('/conheca-a-alcateia')}
        onOpenLocation={scrollToLocation}
      />

      <section id="localizacao" className="location-section">
        <div className="section-head">
          <p className="eyebrow">Localização</p>
          <h2>Venha nos visitar</h2>
        </div>
        <LocationMap address={settings.endereco} mapsUrl={mapsUrl} />
      </section>

      <PublicFooter settings={settings} />

      {bookingOpen && (
        <BookingSheet onClose={() => setBookingOpen(false)}>
          <BookingFlow />
        </BookingSheet>
      )}
    </div>
  );
}