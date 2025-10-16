// src/store/auth.js
import { create } from 'zustand/react';
import { api } from '../lib/api';

export const useAuth = create((set) => ({
        isBootstrapped: false,
        isLoading: false,
        error: null,
        session: null,

        async bootstrap() {
                set({ isLoading: true });
                try {
                        const { data } = await api.get('/api/session');
                        set({ session: data, isBootstrapped: true, isLoading: false, error: null });
                } catch {
                        set({ session: { authenticated: false }, isBootstrapped: true, isLoading: false, error: null });
                }
        },

        async requestOtp(email) {
                const { data } = await api.post('/api/auth/otp/request', { email });
                return data; // { ok, sent, expires_at, email }
        },

        async verifyOtp(email, code) {
                const { data } = await api.post('/api/auth/otp/verify', { email, code });
                // السيشن اتبنت على السيرفر لو ok=true
                const sess = await api.get('/api/session');
                set({ session: sess.data });
                return data;
        },

        async logout() {
                await api.post('/auth/logout');
                set({ session: { authenticated: false } });
        },
}));
