// src/components/Header.jsx
import { useAuth } from '../store/auth';

export default function Header() {
  const isAuthed = useAuth((s) => s.session?.authenticated);
  const username = useAuth((s) => s.session?.merchant?.merchant_username);
  const loginWithSalla = useAuth((s) => s.loginWithSalla);
  const logout = useAuth((s) => s.logout);

  return (
    <header className="p-4 border-b flex items-center justify-between">
      <div className="font-bold">Salla App</div>
      <div className="flex items-center gap-3">
        {isAuthed ? (
          <>
            <span className="text-sm opacity-80">Signed in: {username}</span>
            <button onClick={logout} className="px-3 py-1 bg-black text-white rounded">
              Logout
            </button>
          </>
        ) : (
          <button onClick={loginWithSalla} className="px-3 py-1 bg-black text-white rounded">
            سجّل الدخول عبر سلة
          </button>
        )}
      </div>
    </header>
  );
}
