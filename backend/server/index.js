import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import cors from 'cors';
import path from 'path';

import authRoutes from './server/routes/auth.js'; // هنكتبه بعد شوية

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
        console.error('MONGO_URI missing in .env');
        process.exit(1);
}
await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
console.log('Connected to MongoDB');

// عشان كل ريكويست يعدى عليها االو هى middleware ولو فى سيشن مودوده  ولو مودو هيحملها ولو مش موجود هعمل واحدجه جديده 
app.use(session({
        name: 'salla.sid',
        secret: process.env.SESSION_SECRET || 'please-change-me',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: 'sessions' }),
        cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: false,
                maxAge: 24 * 60 * 60 * 1000
        }
}));

app.use('/auth', authRoutes);

app.get('/', (req, res) => {
        res.send('Backend is running');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));