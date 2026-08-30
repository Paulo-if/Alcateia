import { Link, Route, Routes } from 'react-router-dom';
import { PublicHome } from './components/public/PublicHome';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/conheca-a-alcateia" element={<HomeAboutPlaceholder />} />
      <Route path="/produtos" element={<ProductsPlaceholder />} />
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

// Placeholder mínimo — a Loja de Produtos será desenvolvida futuramente.
function ProductsPlaceholder() {
  return (
    <div className="coming-soon">
      <p className="eyebrow">Alcateia Barber</p>
      <h1>Em breve</h1>
      <p className="muted">
        Nossa loja de produtos está sendo preparada. Em breve você poderá comprar direto pelo site.
      </p>
      <Link to="/" className="btn btn-ghost">
        Voltar à home
      </Link>
    </div>
  );
}