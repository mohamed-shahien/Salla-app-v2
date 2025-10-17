// src/store/auth.js
import { create } from 'zustand';
import api, { attach401Interceptor } from '../lib/api';

export const useAuth = create((set, get) => ({
        isBootstrapped: false,
        isAuthed: false,
        loading: false,
        error: null,
        merchant: null,
        reauthUrl: null,
        forcePasswordChange: false,

        // يشتغل مرّة واحدة لتجهيز الاعتراض
        _interceptorReady: false,
        _ensureInterceptor() {
                if (get()._interceptorReady) return;
                attach401Interceptor((reauthUrl) => set({ reauthUrl }));
                set({ _interceptorReady: true });
        },

        async bootstrap() {
                get()._ensureInterceptor();
                set({ loading: true, error: null });
                try {
                        const { data } = await api.get('/api/session');
                        set({
                                isBootstrapped: true,
                                isAuthed: !!data?.authenticated,
                                merchant: data?.merchant || null,
                                loading: false,
                                error: null,
                                reauthUrl: null,
                                forcePasswordChange: false,
                        });
                } catch (e) {
                        const reauth = e?.response?.data?.reauth || null;
                        set({
                                isBootstrapped: true,
                                isAuthed: false,
                                merchant: null,
                                loading: false,
                                error: null,
                                reauthUrl: reauth
                        });
                }
        },

        async login(email, password) {
                get()._ensureInterceptor();
                set({ loading: true, error: null });
                try {
                        const { data } = await api.post('/auth/app-login', { email, password });
                        // بعد اللوجين، هات السيشن لتثبيت isAuthed + merchant
                        await get().bootstrap();
                        return { ok: true, forceChange: !!data?.force_password_change };
                } catch (e) {
                        const msg = e?.response?.data?.error || 'network_error';
                        set({ loading: false, error: msg });
                        return { ok: false, error: msg };
                }
        },

        async changePassword(currentPassword, newPassword) {
                set({ loading: true, error: null });
                try {
                        const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
                        if (data?.ok) {
                                await get().bootstrap();
                                set({ forcePasswordChange: false, loading: false });
                                return { ok: true };
                        }
                        set({ loading: false, error: data?.error || 'change_password_failed' });
                        return { ok: false, error: data?.error };
                } catch (e) {
                        const msg = e?.response?.data?.error || 'network_error';
                        set({ loading: false, error: msg });
                        return { ok: false, error: msg };
                }
        },

        logoutClientOnly() {
                set({ isAuthed: false, merchant: null, error: null, reauthUrl: null, forcePasswordChange: false });
        }
}));
