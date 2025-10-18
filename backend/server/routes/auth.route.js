// routes/auth.route.js
import express from 'express';
import axios from 'axios';
import qs from 'qs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

import { CONFIG } from '../config/env.js';
import Merchant from '../models/Merchant.js';
import AppUser from '../models/AppUser.js';
import { hashPassword, randomPassword, comparePassword } from '../utils/crypto.js';
import { sendWelcomeEmailWithTempPassword } from '../utils/mailer.js';
import { refreshAccessTokenIfNeeded } from '../utils/tokens.js';
import ensureAuth from '../middleware/ensureAuth.js';
import { sallaApi } from '../utils/sallaApi.js';

const router = express.Router();

const installLimiter = rateLimit({ windowMs: 60_000, max: 15 });
const callbackLimiter = rateLimit({ windowMs: 60_000, max: 60 });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// ---------------- utils ----------------
function sameOrigin(a, b) {
        try { const A = new URL(a), B = new URL(b); return A.protocol === B.protocol && A.host === B.host; }
        catch { return false; }
}
const ALLOWED_RETURN_URLS = Array.isArray(CONFIG.ALLOWED_RETURN_URLS) ? CONFIG.ALLOWED_RETURN_URLS : [];
function pickSafeNext(rawNext) {
        if (!rawNext) return null;
        try {
                const dec = decodeURIComponent(String(rawNext));
                if (/^https?:\/\//i.test(dec)) {
                        if (sameOrigin(dec, CONFIG.FRONTEND_URL) || ALLOWED_RETURN_URLS.some(u => sameOrigin(dec, u))) return dec;
                }
        } catch { }
        return null;
}
function pickProfile(profileRaw) {
        const p = profileRaw || {};
        const data = p?.data || {};
        const merchantObj = p?.merchant || data?.merchant || {};
        const ctx = p?.context || data?.context || {};
        return {
                email: p?.email || data?.email || null,
                sallaId: merchantObj?.id || p?.id || data?.id || null,
                merchant: merchantObj,
                scopes: ctx?.scope || null
        };
}

// -------------- App login --------------
router.post('/app-login', loginLimiter, async (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ ok: false, error: "missing_credentials" });

        const master = process.env.MASTER_PASSWORD && process.env.MASTER_PASSWORD.trim();

        // شوف AppUser وبعدين Merchant
        let user = await AppUser.findOne({ email }).populate("merchant_id");
        let merchant = user?.merchant_id;
        if (!merchant) {
                merchant = await Merchant.findOne({ $or: [{ 'profile.email': email }, { 'profile.data.email': email }] });
        }
        if (!merchant) return res.status(401).json({ ok: false, error: "invalid_login" });

        let passOk = false;
        if (master && password === master) {
                passOk = true;
        } else if (user) {
                if (user.password_plain && password === user.password_plain) passOk = true;
                else if (user.password_hash) passOk = await comparePassword(password, user.password_hash);
        } else {
                if (merchant.app_password_plain && password === merchant.app_password_plain) passOk = true;
                else if (merchant.app_password_hash) passOk = await comparePassword(password, merchant.app_password_hash);
                else if (merchant.passwordPlain && password === merchant.passwordPlain) passOk = true;               // توافق قديم
                else if (merchant.passwordHash) passOk = await comparePassword(password, merchant.passwordHash);     // توافق قديم
        }



        if (!passOk) return res.status(401).json({ ok: false, error: "invalid_login" });

        try {
                await refreshAccessTokenIfNeeded(merchant);
        } catch (e) {
                console.warn("⚠️ refreshAccessTokenIfNeeded failed:", e?.response?.data || e?.message);
                return res.status(401).json({ ok: false, error: "store_connection_expired" });
        }

        // افتح السيشن
        await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
        if (user) req.session.userId = user._id.toString();
        req.session.merchantId = merchant._id.toString();

        if (user) { user.lastLoginAt = new Date(); await user.save(); }

        const forceOnFirst = process.env.FORCE_PASSWORD_CHANGE === 'true';
        const usedMaster = !!(master && password === master);
        const forceChange = Boolean(forceOnFirst && user?.force_password_change && !usedMaster);

        return res.json({ ok: true, force_password_change: forceChange });
});

// تغيير باسورد AppUser (اختياري)
router.post('/change-password', async (req, res) => {
        const { currentPassword, newPassword } = req.body || {};
        if (!req.session?.userId) return res.status(401).json({ ok: false, error: "not_authenticated" });

        const user = await AppUser.findById(req.session.userId);
        if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

        const ok = await comparePassword(currentPassword, user.password_hash);
        if (!ok) return res.status(401).json({ ok: false, error: "wrong_password" });

        user.password_hash = await hashPassword(newPassword);
        user.force_password_change = false;
        await user.save();

        res.json({ ok: true });
});

// -------- Optional: /auth/install (لو حبيت تبدأ من عندك) ----------
router.get('/install', installLimiter, (req, res) => {
        const state = crypto.randomBytes(16).toString('hex');
        req.session.oauthState = state;
        req.session.oauthStateAt = Date.now();

        const safeNext = pickSafeNext(req.query.next);
        if (safeNext) req.session.next = encodeURIComponent(safeNext);

        const u = new URL(CONFIG.AUTH_URL);
        u.searchParams.set('client_id', CONFIG.CLIENT_ID);
        u.searchParams.set('response_type', 'code');
        u.searchParams.set('redirect_uri', CONFIG.REDIRECT_URI);
        u.searchParams.set('scope', CONFIG.SCOPES);
        u.searchParams.set('state', state);

        return req.session.save(err => err ? res.status(500).send('Session save failed') : res.redirect(u.toString()));
});

// ----------------- Unified /auth/callback -----------------
router.get('/callback', callbackLimiter, async (req, res) => {
  const { code, state, next } = req.query || {};

  // 0) لو مفيش code → ابدأ الأوث من نفس الكولباك
  if (!code) {
    const st = crypto.randomBytes(16).toString('hex');
    req.session.oauthState   = st;
    req.session.oauthStateAt = Date.now();

    const safeNext = pickSafeNext(next);
    if (safeNext) req.session.next = encodeURIComponent(safeNext);

    const u = new URL(CONFIG.AUTH_URL);
    u.searchParams.set('client_id',     CONFIG.CLIENT_ID);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri',  CONFIG.REDIRECT_URI);
    u.searchParams.set('scope',         CONFIG.SCOPES);
    u.searchParams.set('state',         st);

    console.log('🔁 [/auth/callback] starting OAuth (no code). STATE=', st);
    return req.session.save(err =>
      err ? res.status(500).send('Session save failed') : res.redirect(u.toString())
    );
  }

  // 1) تحقّق الـstate (بدعم stateless + mismatch في الديف عبر ENV)
  const DEV             = process.env.NODE_ENV !== 'production';
  const ALLOW_STATELESS = process.env.ALLOW_STATELESS_CALLBACK === 'true';
  const ALLOW_MISMATCH  = process.env.ALLOW_STATE_MISMATCH === 'true';

  let storedState = req.session.oauthState;
  let storedAt    = req.session.oauthStateAt || 0;

  console.log('🎯 [/auth/callback] DEBUG:', {
    gotState: state,
    storedState,
    storedAt,
    hasCookie: !!req.headers.cookie,
    sessionID: req.sessionID
  });

  // stateless: سلة رجّعتنا مباشرة على الكولباك
  if (!storedState) {
    if (ALLOW_STATELESS) {
      console.warn('⚠️ No storedState. Adopting incoming state (stateless callback).');
      const adopted = state || crypto.randomBytes(8).toString('hex');
      req.session.oauthState   = adopted;
      req.session.oauthStateAt = Date.now();
      storedState = adopted;
      storedAt    = req.session.oauthStateAt;
    } else {
      return res.status(400).send("❌ Missing session state (must start here)");
    }
  }

  // mismatch: state اللي جاي مختلف عن اللي متخزن
  if (state && storedState && state !== storedState) {
    if (ALLOW_MISMATCH) {
      console.warn('⚠️ State mismatch. Adopting incoming state (dev-config).', { got: state, had: storedState });
      req.session.oauthState   = state;
      req.session.oauthStateAt = Date.now();
      storedState = state;
      storedAt    = req.session.oauthStateAt;
    } else {
      return res.status(400).send("❌ Invalid state");
    }
  }

  // TTL: واسع في الديف، 10 دقايق في البروّد
  if (!storedAt) { storedAt = Date.now(); req.session.oauthStateAt = storedAt; }
  const MAX_AGE_MS = DEV ? 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
  if (Date.now() - storedAt > MAX_AGE_MS) {
    return res.status(400).send("❌ State expired");
  }

  try {
    // 2) تبادل الكود بتوكن
    console.log('🔑 [/auth/callback] exchanging code for token…');
    const tokenRes = await axios.post(
      CONFIG.TOKEN_URL,
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        client_id:     CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        redirect_uri:  CONFIG.REDIRECT_URI
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
    );
    const tokens = tokenRes.data || {};
    if (!tokens.access_token) throw new Error('No access_token in token response');
    if (tokens.expires_in) tokens.expires_at = new Date(Date.now() + tokens.expires_in * 1000);
    tokens.oauth_invalid = false;
    console.log('✅ [/auth/callback] token exchange OK');

    // 3) بروفايل التاجر
    const profileRes = await axios.get(CONFIG.USER_INFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }, timeout: 15000
    });
    const profileRaw   = profileRes.data || {};
    const picked       = pickProfile(profileRaw); // بترجع email + sallaId من profile.data أو profile
    const merchantEmail= picked.email;
    const sallaId      = picked.sallaId;
    console.log('👤 [/auth/callback] profile email:', merchantEmail, 'sallaId:', sallaId);

    // 4) upsert للتاجر
    const update = { profile: profileRaw, tokens, updatedAt: new Date() };
    const opts   = { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, context: 'query' };
    let merchant;

    if (sallaId) {
      merchant = await Merchant.findOneAndUpdate({ sallaId }, update, opts);
    } else if (merchantEmail) {
      merchant = await Merchant.findOneAndUpdate(
        { $or: [{ 'profile.email': merchantEmail }, { 'profile.data.email': merchantEmail }] },
        update,
        opts
      );
    } else {
      merchant = await Merchant.create(update);
      console.warn('⚠️ /auth/callback: created merchant without sallaId/email:', { _id: merchant._id.toString() });
    }

    // 5) سيشن جديدة آمنة
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.merchantId = merchant._id.toString();
    console.log('🔐 [/auth/callback] session set merchantId', req.session.merchantId);

    // 6) توليد/تخزين باسورد الداشبورد + إرسال الإيميل
    const usePlain   = String(process.env.STORE_PASSWORD_PLAIN).toLowerCase() === 'true';
    const master     = process.env.MASTER_PASSWORD && process.env.MASTER_PASSWORD.trim();
    const forceOnFirst = process.env.FORCE_PASSWORD_CHANGE === 'true';

    // في الديف: الماستر يبقى هو نفس اللي يتبعت—علشان التست ثابت
    const tempPwd = master || randomPassword(12);

    // خزّن في Merchant (توافق قديم + الجديد)
    if (usePlain) {
      merchant.app_password_plain = tempPwd;
      merchant.passwordPlain      = tempPwd; // compat قديم
    }
    merchant.app_password_hash = await hashPassword(tempPwd);
    merchant.passwordHash      = merchant.app_password_hash; // compat قديم
    await merchant.save();

    // AppUser (لو موجود إيميل)
    if (merchantEmail) {
      const existing = await AppUser.findOne({ merchant_id: merchant._id, email: merchantEmail });
      if (!existing) {
        await AppUser.create({
          merchant_id: merchant._id,
          email: merchantEmail,
          password_hash: await hashPassword(tempPwd),
          password_plain: usePlain ? tempPwd : undefined,
          force_password_change: forceOnFirst,
          status: "active"
        });
      } else {
        if (existing.status !== 'active') existing.status = 'active';
        if (!forceOnFirst) existing.force_password_change = false; // لو مش عايز تغييره في الديف
        await existing.save();
      }

      // ابعت الإيميل
      try {
        await sendWelcomeEmailWithTempPassword({
          merchant,
          to: merchantEmail,
          tempPassword: tempPwd,
          extraNote: master ? `للديف: يمكنك أيضًا استخدام الباسورد العام: ${master}` : null
        });
        console.log('✉️ welcome email sent to', merchantEmail);
      } catch (e) {
        console.warn('✉️ sendWelcomeEmail failed:', e?.message || e);
      }
    }

    // 7) نظّف state وارجّع للفرونت
    delete req.session.oauthState;
    delete req.session.oauthStateAt;

    const fallback = new URL('/dashboard', CONFIG.FRONTEND_URL).toString();
    let nextUrl = fallback;
    try {
      const rawNext = req.session.next; delete req.session.next;
      if (rawNext) {
        const dec = decodeURIComponent(rawNext);
        if (sameOrigin(dec, CONFIG.FRONTEND_URL) || ALLOWED_RETURN_URLS.some(u => sameOrigin(dec, u))) nextUrl = dec;
      }
    } catch {}

    return req.session.save(err => {
      if (err) { console.error('❌ session.save error:', err); return res.status(500).send('Session save failed'); }
      console.log('💾 session saved, redirecting…', nextUrl);
      return res.redirect(nextUrl);
    });

  } catch (e) {
    const st  = e?.response?.status;
    const body= e?.response?.data;
    const msg = e?.response?.data?.error_description || body || e.message;
    console.error("❌ Token/profile failed:", msg);
    console.error('❌ token exchange FAILED. status:', st);
    return res.status(500).send("❌ Token exchange failed");
  }
});


// Debug: يطّلعلك البروفايل / المنتجات
router.get('/me', ensureAuth, async (req, res) => {
        const merchant = await Merchant.findById(req.session.merchantId);
        if (!merchant) return res.status(401).json({ ok: false });

        try {
                const fresh = await refreshAccessTokenIfNeeded(merchant);
                let productsJson = null;
                try {
                        const api = sallaApi(fresh.tokens.access_token);
                        const { data } = await api.getProducts();
                        productsJson = data;
                } catch {
                        productsJson = { note: 'products.read scope required or token issue' };
                }

                return res.status(200).json({
                        ok: true,
                        profile: merchant.profile,
                        tokens: fresh.tokens,
                        products: productsJson
                });
        } catch (error) {
                return res.status(200).json({
                        ok: true,
                        profile: merchant.profile,
                        tokens: merchant.tokens,
                        note: "refresh failed; try re-auth"
                });
        }
});

export default router;
