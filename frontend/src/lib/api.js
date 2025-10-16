import axios from 'axios';

export const api = axios.create({
        baseURL: import.meta.env.VITE_API_BASE,
        withCredentials: true, // مهم علشان يبعت كوكي السيشن
});

// اختياري: لو السيرفر رجّع 401 ننظّف الحالة
api.interceptors.response.use(
        (r) => r,
        (err) => {
                if (err?.response?.status === 401) {
                        // ممكن نخلي Zustand يعمل reset، أو نرمي المستخدم للهوم
                        window.location.href = '/';
                }
                return Promise.reject(err);
        }
);
