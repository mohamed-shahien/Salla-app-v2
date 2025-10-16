import express from 'express';
import axios from 'axios';
import qs from 'qs';
import crypto from 'crypto';
import { CONFIG } from '../config/env.js';

import Merchant from '../models/Merchant.js';
import ensureAuth from '../middleware/ensureAuth.js';
import { refreshAccessTokenIfNeeded } from '../utils/tokens.js';
import { sallaApi } from '../utils/sallaApi.js';
const router = express.Router();


router.get('/install', (req, res) => {
        const state = crypto.randomBytes(16).toString('hex');
        req.session.oauthState = state;

        const u = new URL(CONFIG.AUTH_URL);
        u.searchParams.set('client_id', CONFIG.CLIENT_ID);
        u.searchParams.set('response_type', 'code');
        u.searchParams.set('redirect_uri', CONFIG.REDIRECT_URI);
        u.searchParams.set('scope', CONFIG.SCOPES);
        u.searchParams.set('state', state);

        return res.redirect(u.toString());
        // المفروض بقا هنا احفظ state عشان اقارنها فى الفرونت SNARK
        // ومش بقا هنا بقا فى الريكوست الى السيرفر
});

router.get('/callback', async (req, res) => {
        const { code, state } = req.query || {};
        if (!code) return res.status(400).send("❌ Missing code");
        if (state !== req.session.oauthState) return res.status(400).send("❌ Invalid state");
        try {
                // 1) تبادل كود بتوكن
                // هنا المفروض الكود موجود هبدلو بتوكين 
                const tokenRes = await axios.post(
                        CONFIG.TOKEN_URL,
                        qs.stringify({
                                grant_type: 'authorization_code',
                                code,
                                client_id: CONFIG.CLIENT_ID,
                                client_secret: CONFIG.CLIENT_SECRET,
                                redirect_uri: CONFIG.REDIRECT_URI
                        }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
                const tokens = tokenRes.data || {};
                if (!tokens.access_token) {
                        throw new Error('No access_token in token response');
                }
                if (tokens.expires_in) {
                        tokens.expires_at = new Date(Date.now() + tokens.expires_in * 1000);
                }

                // 2) نجيب بروفايل التاجر
                const profileRes = await axios.get(CONFIG.USER_INFO_URL, {
                        headers: {
                                Authorization: `Bearer ${tokens.access_token}`
                        }
                })

                const profile = profileRes.data || {};
                const sallaId = profile?.merchant?.id || profile?.id || null;


                const update = {
                        profile,
                        tokens,
                        'tokens.expires_at': tokens.expires_at,
                        updatedAt: new Date()
                };


                const opts = { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, context: 'query' };
                let merchant;
                if (sallaId) {
                        merchant = await Merchant.findOneAndUpdate({ sallaId }, update, opts);
                } else if (profile?.email) {
                        merchant = await Merchant.findOneAndUpdate({ 'profile.email': profile.email }, update, opts);
                } else {
                        merchant = await Merchant.create({ profile, tokens });
                }
                await new Promise((resolve, reject) => {
                        req.session.regenerate(err => (err ? reject(err) : resolve()));
                });
                req.session.merchantId = merchant._id;
                delete req.session.oauthState;
                return res.redirect('/auth/me');
        } catch (e) {
                const msg = e.response?.data || e.message;
                console.error("Token exchange or profile fetch failed:", msg);
                return res.status(500).send("❌ Token exchange failed: " + JSON.stringify(msg));
        }
})


router.get('/me', ensureAuth, async (req, res) => {
        const merchant = await Merchant.findById(req.merchantId);
        if (!merchant) return res.redirect('/auth/install');
        try {
                const fresh = await refreshAccessTokenIfNeeded(merchant);
                const api = await sallaApi.get(fresh.tokens.access_token);
                let brandsJson = null;
                try {
                        const { data } = await api.getBrands();
                        brandsJson = data;
                } catch {
                        brandsJson = { note: 'brands.read scope required or token issue' };
                }
                res.status(200).send(`
                              <h1>✅ Connected to Salla</h1>
                                <h3>Merchant Info</h3>
                                <pre>${JSON.stringify(fresh.profile, null, 2)}</pre>
      <h3>Brands sample</h3>
      <pre>${JSON.stringify(brandsJson, null, 2)}</pre>
      <p><a href="/auth/install">Re-Auth</a></p>
                        `)
        } catch (error) {
                res.send(`
      <h1>✅ Connected to Salla</h1>
      <pre>${JSON.stringify(merchant.profile, null, 2)}</pre>
      <p>⚠️ Couldn't fetch brands (maybe missing scope)</p>
    `);
        }
});
export default router;
