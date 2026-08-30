import { Link, Route, Routes } from 'react-router-dom';
import { PublicHome } from './components/public/PublicHome';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/conheca-a-alcateia" element={<HomeAboutPlaceholder />} />
    </Routes>
  );
}

// Placeholder mínimo — a Landing Page institucional completa será desenvolvida futuramente.
function HomeAboutPlaceholder() {
  return (
    <div className="coming-soon">
      <p className="eyebrow">Alcateia Barber</p>
      <h1>Em breve</h1>
      <p className="muted">
        A página institucional da Alcateia está sendo preparada. Fique de olho.
      </p>
      <Link to="/" className="btn btn-ghost">
        Voltar à home
      </Link>
    </div>
  );
}