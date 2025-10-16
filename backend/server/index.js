import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config/env.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: CONFIG.FRONTEND_URL, credentials: true }));
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

// Routes
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


// https://chatgpt.com/g/g-p-68a18ccecb848191832fd86b3068fd4e-learn-inspiration-at-now-app-salla/c/68f04ed0-150c-8327-b9e1-66efb2857364