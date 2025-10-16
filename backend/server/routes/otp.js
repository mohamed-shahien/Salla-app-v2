// routes/api.js (مقتطفات)
import express from 'express';
import Merchant from '../models/Merchant.js';
import { CONFIG } from '../config/env.js';
import { generateOtp, hashOtp, sendOtpEmail } from '../utils/otp.js';
import { refreshAccessTokenIfNeeded } from '../utils/tokens.js';
import { sallaApi } from '../utils/sallaApi.js';
import ensureAuth from '../middleware/ensureAuth.js';

const router = express.Router();

// طلب OTP
router.post('/auth/otp/request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email is required' });

  const emailNorm = String(email).trim().toLowerCase();
  const merchant = await Merchant.findOne({ 'profile.email': new RegExp(`^${emailNorm}$`, 'i') });
  if (!merchant) {
    return res.status(404).json({ message: 'No merchant with this email' });
  }

  // تأكد من صلاحية/توفر التوكنز (نحاول نعمل refresh)
  try {
    await refreshAccessTokenIfNeeded(merchant);
  } catch {
    // لو refresh فشل: علّمه إنه محتاج OAuth
  }

  const hasUsableTokens = !!merchant.tokens?.access_token && !merchant.tokens?.oauth_invalid;
  if (!hasUsableTokens) {
    return res.status(400).json({ message: 'OAuth required', needOAuth: true });
  }

  // حماية محاولات: لو متقفّل بسبب تجاوز محاولات
  const now = new Date();
  if (merchant.login_otp?.locked_until && now < new Date(merchant.login_otp.locked_until)) {
    return res.status(429).json({ message: 'Too many attempts. Try later.' });
  }

  const code = generateOtp();
  const code_hash = hashOtp(emailNorm, code);
  const expires_at = new Date(Date.now() + CONFIG.OTP_EXP_MIN * 60 * 1000);

  merchant.login_otp = {
    code_hash,
    expires_at,
    attempts: 0,
    locked_until: null,
    sent_to: emailNorm
  };
  await merchant.save();

  await sendOtpEmail(emailNorm, code);

  return res.json({ ok: true, sent: true, expires_at, email: emailNorm });
});

// تحقق OTP
router.post('/auth/otp/verify', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ message: 'email and code are required' });

  const emailNorm = String(email).trim().toLowerCase();
  const merchant = await Merchant.findOne({ 'profile.email': new RegExp(`^${emailNorm}$`, 'i') });

  if (!merchant || !merchant.login_otp?.code_hash) {
    return res.status(400).json({ message: 'No OTP requested' });
  }

  const now = new Date();
  const { attempts = 0, expires_at, locked_until } = merchant.login_otp || {};

  if (locked_until && now < new Date(locked_until)) {
    return res.status(429).json({ message: 'Locked. Try later.' });
  }

  if (!expires_at || now > new Date(expires_at)) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  const provided_hash = hashOtp(emailNorm, String(code).trim());
  const isMatch = provided_hash === merchant.login_otp.code_hash;

  if (!isMatch) {
    const newAttempts = attempts + 1;
    merchant.login_otp.attempts = newAttempts;
    if (newAttempts >= CONFIG.OTP_MAX_ATTEMPTS) {
      merchant.login_otp.locked_until = new Date(Date.now() + CONFIG.OTP_LOCK_MIN * 60 * 1000);
    }
    await merchant.save();
    return res.status(400).json({ message: 'Invalid code' });
  }

  // نجاح: شغّل السيشن وامسح الـ OTP
  await new Promise((resolve, reject) => {
    req.session.regenerate(err => (err ? reject(err) : resolve()));
  });
  req.session.merchantId = merchant._id;

  merchant.login_otp = undefined; // امسح
  await merchant.save();

  return res.json({ ok: true, authenticated: true });
});

// سيشن للفرونت
router.get('/session', async (req, res) => {
  if (!req.session.merchantId) return res.json({ authenticated: false });

  const merchant = await Merchant.findById(req.session.merchantId);
  if (!merchant) return res.json({ authenticated: false });

  const p = merchant.profile || {};
  const m = p.merchant || {};
  const ctx = p.context || {};

  return res.json({
    authenticated: true,
    merchant: {
      id: merchant._id,
      email: p.email || null,
      merchant_id: m.id || null,
      merchant_username: m.username || null,
      merchant_name: m.name || null,
      scopes: ctx.scope || null,
      has_refresh: !!merchant.tokens?.refresh_token,
      token_expires_at: merchant.tokens?.expires_at || null
    }
  });
});

// مثال API محمي
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
