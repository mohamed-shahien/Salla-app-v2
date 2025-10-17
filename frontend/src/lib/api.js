// src/lib/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: '/',              // مهم: relative مع البروكسي
  withCredentials: true,     // مهم: عشان الكوكي
});

// (اختياري) لو السيرفر رجع reauth، نبعته للمخزن
export function attach401Interceptor(pushReauth) {
  api.interceptors.response.use(
    r => r,
    err => {
      const reauth = err?.response?.data?.reauth;
      if (reauth && typeof pushReauth === 'function') pushReauth(reauth);
      return Promise.reject(err);
    }
  );
}

export default api;
