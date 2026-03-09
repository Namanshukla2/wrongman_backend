// server/routes/payment.js
import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (keyId && keySecret) {
  try {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('✅ Razorpay initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Razorpay:', err.message);
  }
} else {
  console.warn('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in .env');
}

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        message: 'Razorpay not configured. Please use another payment method.',
      });
    }

    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const options = {
      amount: amount * 100, // to paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify Razorpay payment signature
router.post('/verify-payment', (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay not configured',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// Razorpay status
router.get('/status', (req, res) => {
  res.json({
    razorpayAvailable: !!razorpay,
    message: razorpay ? 'Razorpay is active' : 'Razorpay not configured',
  });
});

export default router;