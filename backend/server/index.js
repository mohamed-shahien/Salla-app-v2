import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config/env.js';
import authRoutes from './routes/auth.route.js';
import apiRoutes from './routes/api.js';

import Merchant from './models/Merchant.js';

import devRoutes from './routes/dev.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigin = new URL(CONFIG.FRONTEND_URL).origin;

app.use(cors({
        origin: allowedOrigin,
        credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!CONFIG.MONGO_URI) {
        console.error('❌ MONGO_URI not found in .env');
        process.exit(1);
}
await mongoose.connect(CONFIG.MONGO_URI, {
        dbName: CONFIG.MONGO_DB_NAME || undefined,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
});
console.log('✅ Connected to MongoDB');

// إعداد الـ session (مخزنة في Mongo)
app.use(session({
        name: 'salla.sid',
        secret: CONFIG.SESSION_SECRET || 'please-change-me',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: CONFIG.MONGO_URI, collectionName: 'sessions' }),
        cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: false,
                maxAge: 24 * 60 * 60 * 1000
        }
}));

app.use(devRoutes);
app.use(async (req, res, next) => {
        try {
                const sid = req.session?.merchantId;
                if (sid && !mongoose.Types.ObjectId.isValid(sid)) {
                        console.log('🧹 sanitizer: non-ObjectId in session', sid);
                        const m = await Merchant.findOne({ sallaId: sid });
                        if (m) {
                                console.log('🧹 sanitizer: mapped sallaId -> _id', m._id.toString());
                                req.session.merchantId = m._id.toString();
                        } else {
                                console.log('🧹 sanitizer: clearing bad merchantId');
                                delete req.session.merchantId;
                        }
                }
        } catch (e) { console.warn('sanitizer error', e.message); }
        next();
});
app.use('/auth', authRoutes)
app.use('/api', apiRoutes);


// لوج آوت بسيط
app.post('/auth/logout', (req, res) => {
        req.session.destroy(() => res.json({ ok: true }));
});


app.get('/', (req, res) => {
        res.send('✅ Backend is running');
});

const PORT = CONFIG.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
