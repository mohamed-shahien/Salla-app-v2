// src/pages/Dashboard.jsx
import { useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../store/auth';

export default function Dashboard(){
  const { isAuthed } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/me', { headers: { Accept: 'text/html' }});
        console.log(res)
        // لو رجع 200 وسيشن شغالة، مفيش حاجة نعملها
      } catch (e) {
        if (e?.response?.status === 401) {
          // خرج بره — خليه يرجع للّوجين
          window.location.href = '/login';
        }
      }
    })();
  }, [isAuthed]);

  return (
    <div style={{ padding: 24 }}>
      <h1>لوحة التحكم</h1>
      <p>لو احتجت إعادة الربط:</p>
      <a href={`/auth/install?next=${encodeURIComponent(window.location.origin + '/dashboard')}`}>
        ربط/إعادة الربط مع سلة
      </a>
    </div>
  );
}
