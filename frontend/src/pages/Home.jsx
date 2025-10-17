import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  useEffect(() => {
    if (isAuthed) navigate('/dashboard', { replace: true });
  }, [isAuthed, navigate]);

  return (
    <div style={{ minHeight: '100vh', display:'grid', placeItems:'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign:'center' }}>
        <h1 style={{ marginBottom: 12 }}>مرحبًا 👋</h1>
        <p style={{ marginBottom: 24 }}>
          سجّل دخولك للوصول إلى لوحة التحكم وربط متجرك بسلة.
        </p>

        {/* الزر الأساسي */}
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            border: '1px solid #111',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          تسجيل الدخول
        </button>

        {/* أو لو تحب Link بدل onClick */}
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          أو <Link to="/login">اذهب لصفحة تسجيل الدخول</Link>
        </div>

        {/* (اختياري) زر الربط مع سلة مباشرة */}
        <div style={{ marginTop: 24 }}>
          <a
            href={`/auth/install?next=${encodeURIComponent(window.location.origin + '/dashboard')}`}
            style={{ textDecoration: 'none' }}
          >
            ربط/إعادة الربط مع سلة
          </a>
        </div>
      </div>
    </div>
  );
}
