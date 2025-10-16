import { useAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { session, logout } = useAuth();
  const isAuthed = session?.authenticated;
  const username = session?.merchant?.merchant_username;
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/verify');   // أو '/login' لو غيرت اسم الصفحة
  };

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
          <button onClick={handleLoginClick} className="px-3 py-1 bg-black text-white rounded">
            سجّل الدخول عبر سلة
          </button>
        )}
      </div>
    </header>
  );
}
