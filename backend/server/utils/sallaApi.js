import axios from 'axios';
import { CONFIG } from '../config/env.js';

export function sallaApi(accessToken) {
        const instance = axios.create({
                baseURL: CONFIG.API_BASE,
                headers: { Authorization: `Bearer ${accessToken}` }
        });

        return {
                getBrands: () => instance.get('/brands'),
                getProducts: (params = {}) => instance.get('/products', { params }),
                getOrders: (params = {}) => instance.get('/orders', { params }),
        };
}
