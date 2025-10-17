// src/store/auth.js
import { create } from 'zustand/react';
import { api } from '../lib/api';

function buildNextUrl(path = '/dashboard') {
        return new URL(path, window.location.origin).toString();
}

export const useAuth = create((set) => ({
        isBootstrapped: false,
        isLoading: false,
        error: null,
        session: null, // { authenticated, merchant: {...} }

        async bootstrap() {
                set({ isLoading: true });
                try {
                        const { data } = await api.get('/api/session');
                        set({ session: data, isBootstrapped: true, isLoading: false, error: null });
                } catch {
                        set({
                                session: { authenticated: false },
                                isBootstrapped: true,
                                isLoading: false,
                                error: null,
                        });
                }
        },

        loginWithSalla() {
                const next = encodeURIComponent(buildNextUrl('/dashboard'));
                window.location.href = `${import.meta.env.VITE_API_BASE}/auth/install?next=${next}`;
        },

        async logout() {
                await api.post('/auth/logout');
                set({ session: { authenticated: false } });
                window.location.href = '/';
        },
}));
