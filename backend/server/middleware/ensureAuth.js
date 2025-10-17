// middleware/ensureAuth.js
import mongoose from 'mongoose';
import Merchant from '../models/Merchant.js';

export default async function ensureAuth(req, res, next) {
        const sid = req.session?.merchantId;
        if (!sid) return res.status(401).json({ ok: false, message: 'Not authenticated', reauth: '/auth/install' });

        let id = sid;

        if (!mongoose.Types.ObjectId.isValid(id)) {
                const m = await Merchant.findOne({ sallaId: id });

                if (!m) return res.status(401).json({ ok: false, message: 'Not authenticated', reauth: '/auth/install' });
                req.session.merchantId = m._id.toString();
                id = m._id.toString();
                console.log('🛡️ ensureAuth: mapped sallaId -> _id', { sallaId: sid, _id: id });
        }

        req.merchantId = id; // ده اللي api.js بيستخدمه
        next();
}
