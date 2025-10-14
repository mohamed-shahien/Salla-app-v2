
import express from 'express';
import axios from 'axios';
import qs from 'qs';
import crypto from 'crypto';
import Merchant from '../models/Merchant.js';

const router = express.Router();
const {
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
        AUTH_URL,
        TOKEN_URL,
        USER_INFO_URL,
        API_BASE,
        SCOPES
} = process.env;

router.get('/install', (req, res) => {
        const state = crypto.randomBytes(16).toString('hex');
        raq.session.state = state;
        const u = new URL();
        u.searchParams.set('client_id', CLIENT_ID);
        u.searchParams.set('response_type', 'code');
        u.searchParams.set('redirect_uri', REDIRECT_URI);
        u.searchParams.set('scope', SCOPES);
        u.searchParams.set('state', state);
        res.redirect(u.toString());
        // المفروض بقا هنا احفظ state عشان اقارنها فى الفرونت SNARK
        // ومش بقا هنا بقا فى الريكوست الى السيرفر
});


router.get('/callback', async (req, res) => {
        const { code, state } = req.query;
        if (!code) return res.status(400).send('Missing code');
        if (state !== req.session.oauthState) return res.status(400).send("❌ Invalid state");
        try {


                // هنا المفروض الكود موجود هبدلو بتوكين 
                const tokenRes = await axios.post(
                        TOKEN_URL,
                        qs.stringify({
                                grant_type: 'authorization_code',
                                code,
                                client_id: CLIENT_ID,
                                client_secret: CLIENT_SECRET,
                                redirect_uri: REDIRECT_URI
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

                const profileRes = await axios.get(USER_INFO_URL, {
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
                return res.redirect('/me');
        } catch (e) {
                const msg = e.response?.data || e.message;
                console.error("Token exchange or profile fetch failed:", msg);
                return res.status(500).send("❌ Token exchange failed: " + JSON.stringify(msg));
        }
})


router.get('/me', async (req, res) => {
        const merchantId = req.session.merchantId;
        if (!merchantId) return res.status(401).send('Unauthorized');

        const merchant = await Merchant.findById(merchantId);
        if (!merchant) return res.redirect('/auth/install');
        try {
                const brandsRes = await axios.get(`${API_BASE}/brands`, {
                        headers: { Authorization: `Bearer ${merchant.tokens.access_token}` }
                });
                res.send(`
                              <h1>✅ Connected to Salla</h1>
                                <h3>Merchant Info</h3>
                                <pre>${JSON.stringify(merchant.profile, null, 2)}</pre>
                                <h3>Brands</h3>
                                <pre>${JSON.stringify(brandsRes.data, null, 2)}</pre>
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
