// utils/mailer.js
import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';

let transporter;

export function getTransporter() {
        if (transporter) return transporter;

        transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: Number(process.env.SMTP_PORT || 465),
                secure: String(process.env.SMTP_SECURE || 'true') === 'true', // Gmail بيشتغل 465 secure
                auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS, // ده ال App Password
                },
        });

        return transporter;
}

export async function sendWelcomeEmailWithTempPassword({ merchant, to, tempPassword }) {
        const html = `
    <p>مرحبًا! تم ربط متجرك بنجاح.</p>
    <p>كلمة المرور المؤقتة: <strong>${tempPassword}</strong></p>
    <p><a href="${process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL}/login">تسجيل الدخول</a> ثم غيّرها من صفحة تغيير كلمة المرور.</p>
  `;

        const log = await EmailLog.create({
                merchant_id: merchant._id,
                to,
                template: 'welcome-temp-password',
                provider: 'smtp/gmail',
                status: 'queued'
        });

        const info = await getTransporter().sendMail({
                from: process.env.MAIL_FROM,
                to,
                subject: 'Your Dashboard Access',
                html
        });

        log.provider_message_id = info.messageId || null;
        log.status = 'sent';
        log.meta = { response: info.response };
        await log.save();
}

// اختياري: لينك إعداد كلمة مرور بدل المؤقت
export async function sendPasswordSetupEmail({ merchant, to, setupLink }) {
        const log = await EmailLog.create({
                merchant_id: merchant._id,
                to,
                template: 'password-setup-link',
                provider: 'smtp/gmail',
                status: 'queued'
        });

        const info = await getTransporter().sendMail({
                from: process.env.MAIL_FROM,
                to,
                subject: 'Set up your password',
                html: `
      <p>مرحبًا! اضغط اللينك التالي لإعداد كلمة المرور:</p>
      <p><a href="${setupLink}">${setupLink}</a></p>
      <p>اللينك صالح لفترة محدودة.</p>
    `
        });

        log.provider_message_id = info.messageId || null;
        log.status = 'sent';
        log.meta = { response: info.response };
        await log.save();
}
