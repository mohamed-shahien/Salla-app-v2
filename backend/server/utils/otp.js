import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { CONFIG } from '../config/env.js';

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digits
}

export function hashOtp(email, code) {
  const h = crypto.createHmac('sha256', CONFIG.OTP_SECRET);
  h.update(`${email.toLowerCase()}::${code}`);
  return h.digest('hex');
}

export async function sendOtpEmail(to, code) {
  // DEV fallback بدون SMTP
  if (!CONFIG.SMTP_HOST) {
    console.log(`📧 [DEV] OTP to ${to}: ${code}`);
    return { dev: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: CONFIG.SMTP_HOST,
      port: Number(CONFIG.SMTP_PORT || 587),
      secure: CONFIG.SMTP_SECURE === 'true',
      auth: CONFIG.SMTP_USER ? { user: CONFIG.SMTP_USER, pass: CONFIG.SMTP_PASS } : undefined,
    });

    await transporter.sendMail({
      from: CONFIG.SMTP_FROM || 'no-reply@example.com',
      to,
      subject: 'رمز الدخول لمتجرك',
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>رمز الدخول</h2>
          <p>صالح لمدة ${CONFIG.OTP_EXP_MIN} دقائق</p>
          <div style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</div>
        </div>
      `
    });

    return { dev: false };
  } catch (err) {
    console.error('sendOtpEmail failed:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 [DEV Fallback] OTP to ${to}: ${code}`);
      return { dev: true };
    }
    throw err; // إنتاج: اعتبره فشل
  }
}
