// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Login() {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const nav = useNavigate();
        const { login, loading, error } = useAuth();

        async function onSubmit(e) {
                e.preventDefault();
                const { ok, forceChange } = await login(email, password);
                if (ok) {
                        if (forceChange) nav('/change-password', { replace: true });
                        else nav('/dashboard', { replace: true });
                }
        }

        return (
                <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui' }}>
                        <h2>تسجيل الدخول</h2>
                        <form onSubmit={onSubmit}>
                                <div style={{ margin: '12px 0' }}>
                                        <label>الإيميل</label>
                                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required style={{ width: '100%' }} />
                                </div>
                                <div style={{ margin: '12px 0' }}>
                                        <label>الباسورد</label>
                                        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required style={{ width: '100%' }} />
                                </div>
                                {error && <div style={{ color: 'crimson', marginTop: 8 }}>خطأ: {String(error)}</div>}
                                <button disabled={loading} type="submit">{loading ? 'جارى الدخول…' : 'دخول'}</button>
                        </form>
                        <div style={{ marginTop: 12, fontSize: 12, opacity: .7 }}>
                                في الديف: ينفع تستخدم الماستر باسورد أو الباسورد المؤقت اللي وصلك على الإيميل.
                        </div>
                </div>
        );
}
