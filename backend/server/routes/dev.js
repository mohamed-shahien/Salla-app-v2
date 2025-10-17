// routes/dev.js (اختياري للتجارب اليدوية)
import express from 'express';
import Merchant from '../models/Merchant.js';
import { sendWelcomeEmailWithTempPassword } from '../utils/mailer.js';

const router = express.Router();

router.post('/dev/test-email', async (req, res) => {
  try {
    const { to, merchantId } = req.body || {};
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) return res.status(404).json({ error: 'merchant not found' });

    await sendWelcomeEmailWithTempPassword({ merchant, to, tempPassword: 'Test-12345678' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
