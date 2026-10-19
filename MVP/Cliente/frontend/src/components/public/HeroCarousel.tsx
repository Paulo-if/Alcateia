import { useEffect, useState } from 'react';
import img1 from '../../assets/Img01.jpg';
import img2 from '../../assets/Img02.jpg';
import img3 from '../../assets/Img03.jpg';

const SLIDES = [
  { src: img1, alt: 'Ambiente da Alcateia Barbearia com iluminação premium' },
  { src: img2, alt: 'Cadeiras e detalhes do ambiente da Alcateia Barbearia' },
  { src: img3, alt: 'Cuidado e detalhe no atendimento da Alcateia Barbearia' },
];

const INTERVAL_MS = 3500;

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="hero-carousel"
      role="img"
      aria-label="Fotos do ambiente da Alcateia Barbearia"
    >
      {SLIDES.map((slide, index) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={index === active ? 'hero-slide is-active' : 'hero-slide'}
          loading="eager"
          decoding="async"
          aria-hidden={index !== active}
        />
      ))}
      <div className="hero-overlay" aria-hidden="true" />
    </div>
  );
}