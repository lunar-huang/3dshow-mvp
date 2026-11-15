import { usePrivy } from '@privy-io/react-auth';
import { PRIVY_ENABLED } from '../lib/auth.js';

function AuthStatusInner() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) return null;

  if (!authenticated) {
    return (
      <button className="link-btn" onClick={login}>
        Login
      </button>
    );
  }

  const label = user?.email?.address || user?.google?.email || 'Account';
  return (
    <span className="auth-status">
      {label}{' '}
      <button className="link-btn" onClick={logout}>
        Logout
      </button>
    </span>
  );
}

export default function AuthStatus() {
  if (!PRIVY_ENABLED) return null;
  return <AuthStatusInner />;
}
