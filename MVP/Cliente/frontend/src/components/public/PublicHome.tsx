import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from './Hero';
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

  return (
    <div className="public-shell">
      <Hero
        onOpenBooking={() => setBookingOpen(true)}
        onOpenAbout={() => navigate('/conheca-a-alcateia')}
        onOpenProducts={() => navigate('/produtos')}
      />

      <section id="localizacao" className="location-section">
        <div className="section-head">
          <p className="eyebrow">Localização</p>
          <h2>Venha nos visitar</h2>
        </div>
        <iframe
          className="map-frame"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4318.6965425811695!2d-49.12235538883765!3d-15.335913485180663!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935cc14a8df8df73%3A0x8e073b50d314c9db!2sAlcat%C3%A9ia%20Barbearia!5e1!3m2!1sen!2sbr!4v1788101818180!5m2!1sen!2sbr"
          width="400"
          height="300"
          title="Alcateia Barbearia no Google Maps"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
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