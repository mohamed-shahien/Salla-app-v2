export default function ensureAuth(req, res, next) {
        if (!req.session.merchantId) {
                return res.status(401).json({ ok: false, message: 'Not authenticated', reauth: '/auth/install' });
        }
        req.merchantId = id; 

        next();
}