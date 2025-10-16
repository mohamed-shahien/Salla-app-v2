// src/pages/VerifyStore.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function VerifyStore() {
        const { session, requestOtp, verifyOtp } = useAuth();
        const nav = useNavigate();

        const [step, setStep] = useState('email'); // 'email' | 'otp'
        const [email, setEmail] = useState('');
        const [sentInfo, setSentInfo] = useState(null); // {expires_at, email}
        const [code, setCode] = useState('');
        const [err, setErr] = useState(null);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
                if (session?.authenticated) nav('/dashboard', { replace: true });
        }, [session, nav]);

        const onRequest = async (e) => {
                e.preventDefault();
                setErr(null); setLoading(true);
                try {
                        const r = await requestOtp(email.trim());
                        setSentInfo(r);
                        setStep('otp');
                } catch (e) {
                        setErr(e?.response?.data?.message || 'Failed to send OTP');
                } finally {
                        setLoading(false);
                }
        };

        const onVerify = async (e) => {
                e.preventDefault();
                setErr(null); setLoading(true);
                try {
                        const r = await verifyOtp(sentInfo?.email || email.trim(), code.trim());
                        if (r?.authenticated) nav('/dashboard', { replace: true });
                } catch (e) {
                        setErr(e?.response?.data?.message || 'Invalid code');
                } finally {
                        setLoading(false);
                }
        };

        return (
                <div className="p-6 max-w-md">
                        <h1 className="text-xl mb-3">تسجيل الدخول عبر OTP</h1>

                        {step === 'email' && (
                                <form onSubmit={onRequest} className="flex flex-col gap-3">
                                        <label className="flex flex-col">
                                                <span className="text-sm">الإيميل</span>
                                                <input
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        className="border rounded px-3 py-2"
                                                        placeholder="owner@example.com"
                                                        required
                                                />
                                        </label>
                                        <button className="px-3 py-2 bg-black text-white rounded" disabled={loading}>
                                                {loading ? 'إرسال...' : 'إرسال رمز OTP'}
                                        </button>
                                        {err && <p className="text-red-600 text-sm">{err}</p>}
                                </form>
                        )}

                        {step === 'otp' && (
                                <form onSubmit={onVerify} className="flex flex-col gap-3">
                                        <p className="text-sm">
                                                تم إرسال الرمز إلى: <b>{sentInfo?.email}</b>
                                        </p>
                                        <label className="flex flex-col">
                                                <span className="text-sm">أدخل الرمز</span>
                                                <input
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        maxLength={6}
                                                        value={code}
                                                        onChange={(e) => setCode(e.target.value)}
                                                        className="border rounded px-3 py-2 tracking-widest"
                                                        placeholder="••••••"
                                                        required
                                                />
                                        </label>
                                        <button className="px-3 py-2 bg-black text-white rounded" disabled={loading}>
                                                {loading ? 'تحقق...' : 'تحقق'}
                                        </button>
                                        {err && <p className="text-red-600 text-sm">{err}</p>}
                                        <button type="button" className="text-sm underline" onClick={() => setStep('email')}>
                                                تغيير الإيميل
                                        </button>
                                </form>
                        )}
                </div>
        );
}
