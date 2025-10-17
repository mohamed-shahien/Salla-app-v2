import express from 'express';
import ensureAuth from '../middleware/ensureAuth.js';
import Merchant from '../models/Merchant.js';
import { refreshAccessTokenIfNeeded } from '../utils/tokens.js';
import { sallaApi } from '../utils/sallaApi.js';

const router = express.Router();



router.get('/session', async (req, res) => {
        if (!req.session.merchantId) return res.status(401).json({ ok: false, message: 'Not authenticated', reauth: '/auth/install', authenticated: false });
        const merchant = await Merchant.findById(req.session.merchantId);
        if (!merchant) return res.status(401).json({ ok: false, message: 'Not authenticated', reauth: '/auth/install', authenticated: false });
        const profile = merchant.profile || {};
        const ctx = profile?.context || {};
        const m = profile?.merchant || {};
        return res.json({
                authenticated: true,
                merchant: {
                        id: merchant._id,
                        email: profile.email || null,
                        merchant_id: m.id || null,
                        merchant_username: m.username || null,
                        scopes: ctx.scope || null,
                        verified: !!merchant.verified,
                        has_refresh: !!merchant.tokens?.refresh_token,
                        token_expires_at: merchant.tokens?.expires_at || null
                }
        });
})



router.get('/brands', ensureAuth, async (req, res) => {
        try {
                const merchant = await Merchant.findById(req.merchantId);
                const fresh = await refreshAccessTokenIfNeeded(merchant);
                const api = sallaApi(fresh.tokens.access_token);
                const { data } = await api.getBrands();
                return res.json(data);
        } catch (e) {
                return res.status(500).json({ message: 'brands fetch failed', error: e?.response?.data || e.message });
        }
});


export default router;