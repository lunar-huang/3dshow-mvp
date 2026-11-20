import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import ClaimPage from './pages/ClaimPage.jsx';
import DemoPanel from './pages/DemoPanel.jsx';
import StudioPage from './pages/StudioPage.jsx';
import AuthStatus from './components/AuthStatus.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">3Dshow</Link>
        <nav>
          <AuthStatus />
          <Link to="/studio">Studio</Link>
          <Link to="/demo">Demo panel</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/card/:slug" element={<ClaimPage />} />
        <Route path="/demo" element={<DemoPanel />} />
        <Route path="/studio" element={<StudioPage />} />
      </Routes>
    </div>
  );
}
