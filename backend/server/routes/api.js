import express from 'express';
import ensureAuth from '../middleware/ensureAuth.js';
import Merchant from '../models/Merchant.js';
import { refreshAccessTokenIfNeeded } from '../utils/tokens.js';
import { sallaApi } from '../utils/sallaApi.js';

const router = express.Router();

// helper: يستخرج القيم بغض النظر عن شكل الـprofile
function pickProfile(profileRaw) {
        const p = profileRaw || {};
        const data = p?.data || {};
        const merchantObj = p?.merchant || data?.merchant || {};
        const ctx = p?.context || data?.context || {};
        return {
                email: p?.email || data?.email || null,
                merchant: merchantObj,
                scopes: ctx?.scope || null
        };
}

router.get('/session', async (req, res) => {
        if (!req.session?.merchantId) return res.json({ authenticated: false });

        const merchant = await Merchant.findById(req.session.merchantId);
        if (!merchant) return res.json({ authenticated: false });

        const info = pickProfile(merchant.profile);
        return res.json({
                authenticated: true,
                merchant: {
                        id: merchant._id,
                        email: info.email,
                        merchant_id: info.merchant?.id || null,
                        merchant_username: info.merchant?.username || null,
                        scopes: info.scopes,
                        verified: !!merchant.verified,
                        has_refresh: !!merchant.tokens?.refresh_token,
                        token_expires_at: merchant.tokens?.expires_at || null
                }
        });
});

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
