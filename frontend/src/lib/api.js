// src/lib/api.js
import axios from 'axios';

export const api = axios.create({
        baseURL: import.meta.env.VITE_API_BASE,
        withCredentials: true,
});

api.interceptors.response.use(
        (r) => r,
        (err) => {
                // 401 = مش مسجل دخول → خليه يترمي للـ Protected
                if (err?.response?.status === 401) {
                        return Promise.reject(Object.assign(err, { _auth401: true }));
                }
                // Network error = الباك واقع → useful لو عايز تعرض بانر
                if (!err.response) {
                        window.dispatchEvent(new CustomEvent('api:offline'));
                }
                return Promise.reject(err);
        }
);