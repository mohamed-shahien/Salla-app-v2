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

// التأكد من وجود التوكن
router.get('/verify', ensureAuth, async (req, res) => {
        const { username, email } = req.body || {};
        if (!username || !email) return res.status(400).json({ message: 'username & email are required' });
        const merchant = await Merchant.findById(req.merchantId);
        if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
        const p = merchant.profile || {};
        const m = p.merchant || {};
        if (String(p.email).toLowerCase() !== String(email).toLowerCase()) {
                return res.status(400).json({ message: 'Email does not match the OAuth profile' });
        }
        if (String(m.username || '').toLowerCase() !== String(username).toLowerCase()) {
                return res.status(400).json({ message: 'Store username does not match the OAuth profile' });
        }
        if (!merchant.tokens?.access_token) {
                return res.status(400).json({ message: 'No tokens saved for this merchant' });
        }
        merchant.verified = true;
        await merchant.save();
        return res.json({ ok: true });
})
router.post('/auth/otp/request', async (req, res) => {
        try {
                const { email } = req.body || {};
                if (!email) return res.status(400).json({ message: 'email is required' });

                const emailNorm = String(email).trim().toLowerCase();
                const merchant = await Merchant.findOne({ 'profile.email': new RegExp(`^${emailNorm}$`, 'i') });
                if (!merchant) {
                        return res.status(404).json({ message: 'No merchant with this email' });
                }

                // جرّب تحدّث التوكن لو قرب ينتهي
                try {
                        await refreshAccessTokenIfNeeded(merchant);
                } catch (e) {
                        // تجاهل هنا؛ لو فشل هنرفض OTP تحت
                        console.warn('refreshAccessTokenIfNeeded failed:', e?.response?.data || e.message);
                }

                const hasUsableTokens = !!merchant.tokens?.access_token && !merchant.tokens?.oauth_invalid;
                if (!hasUsableTokens) {
                        return res.status(400).json({ message: 'OAuth required', needOAuth: true });
                }

                const now = new Date();
                if (merchant.login_otp?.locked_until && now < new Date(merchant.login_otp.locked_until)) {
                        return res.status(429).json({ message: 'Too many attempts. Try later.' });
                }

                const code = generateOtp();
                const code_hash = hashOtp(emailNorm, code);
                const expires_at = new Date(Date.now() + CONFIG.OTP_EXP_MIN * 60 * 1000);

                merchant.login_otp = { code_hash, expires_at, attempts: 0, locked_until: null, sent_to: emailNorm };
                await merchant.save();

                const { dev } = await sendOtpEmail(emailNorm, code);

                return res.json({
                        ok: true,
                        sent: true,
                        expires_at,
                        email: emailNorm,
                        mode: dev ? 'dev_log' : 'smtp'
                });
        } catch (err) {
                console.error('OTP request error:', err);
                return res.status(500).json({ message: 'server_error' });
        }
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