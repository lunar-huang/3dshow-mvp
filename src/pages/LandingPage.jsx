import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <main className="landing">
      <h1>Digital ownership for physical collectible cards</h1>
      <p>
        Tap a card's NFC tag, open its page, claim its numbered digital twin —
        no wallet, no seed phrase, no gas.
      </p>
      <Link className="btn" to="/card/test-card">
        Try the demo card
      </Link>
      <p className="hint">
        This is a placeholder UI — the real presentation layer is being built
        separately.
      </p>
    </main>
  );
}
