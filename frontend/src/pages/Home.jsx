// src/pages/Home.jsx
import { useAuth } from '../store/auth';

export default function Home() {
  const isAuthed = useAuth((s) => s.session?.authenticated);
  const loginWithSalla = useAuth((s) => s.loginWithSalla);

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-2">مرحبًا 👋</h1>
      <p className="mb-6">سجّل الدخول عبر سلة للوصول إلى لوحة التحكم الخاصة بمتجرك.</p>

      {!isAuthed && (
        <button onClick={loginWithSalla} className="px-4 py-2 bg-black text-white rounded">
          سجّل الدخول عبر سلة
        </button>
      )}

      {isAuthed && <p className="text-green-700">أنت مسجّل دخول بالفعل ✅</p>}
    </div>
  );
}
