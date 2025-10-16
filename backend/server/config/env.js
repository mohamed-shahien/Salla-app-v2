// backend/server/config/env.js
import dotenv from 'dotenv';

dotenv.config();

function required(name) {
        const val = (process.env[name] || '').trim();
        if (!val) throw new Error(`Missing required env: ${name}`);
        return val;
}
function optional(name, def = '') {
        const raw = process.env[name];
        return (raw == null ? def : raw).toString().trim();
}
function optionalBool(name, def = false) {
        const raw = (process.env[name] ?? (def ? 'true' : 'false')).toString().trim().toLowerCase();
        return raw === 'true' || raw === '1' || raw === 'yes';
}
function mustBeUrl(value, name) {
        try {
                // هتـthrow لو بايظة
                return new URL(value).toString();
        } catch {
                throw new Error(`Invalid URL in env ${name}: ${value}`);
        }
}

function optionalNum(name, def) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : def;
}

export const CONFIG = {
        PORT: optional('PORT', '3000'),
        SESSION_SECRET: required('SESSION_SECRET'),
        MONGO_DB_NAME: required('MONGO_DB_NAME'),
        MONGO_URI: required('MONGO_URI'),
        CLIENT_ID: required('CLIENT_ID'),
        CLIENT_SECRET: required('CLIENT_SECRET'),
        REDIRECT_URI: mustBeUrl(required('REDIRECT_URI'), 'REDIRECT_URI'),
        AUTH_URL: mustBeUrl(required('AUTH_URL'), 'AUTH_URL'),
        TOKEN_URL: mustBeUrl(required('TOKEN_URL'), 'TOKEN_URL'),
        USER_INFO_URL: mustBeUrl(required('USER_INFO_URL'), 'USER_INFO_URL'),
        API_BASE: mustBeUrl(required('API_BASE'), 'API_BASE'),
        SCOPES: required('SCOPES'),
        FRONTEND_URL: mustBeUrl(required('FRONTEND_URL'), 'FRONTEND_URL'),
        DEV_ALLOW_EMAIL_LOGIN: optionalBool('DEV_ALLOW_EMAIL_LOGIN', false),

        PUBLIC_BASE_URL: optional('PUBLIC_BASE_URL'),
        OTP_SECRET: required('OTP_SECRET'),
        OTP_EXP_MIN: optionalNum('OTP_EXP_MIN', 5),          // صلاحية الرمز بالدقائق
        OTP_MAX_ATTEMPTS: optionalNum('OTP_MAX_ATTEMPTS', 5),
        OTP_LOCK_MIN: optionalNum('OTP_LOCK_MIN', 10),
};