// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendPasswordResetEmail, sendOtpEmail } from '../utils/email.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_NAME = 'token';
const FRONTEND_URL = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const IS_PROD = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,           // true in production (HTTPS), false in dev
  sameSite: IS_PROD ? 'none' : 'lax', // 'none' for cross-origin in prod, 'lax' for dev
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Helper: Generate JWT and set cookie
function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  return token;
}

// Helper: Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Return user data (without sensitive info)
function userResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
  };
}

// ═══════════════════════════════════════════════════════════
// EMAIL/PASSWORD AUTH
// ═══════════════════════════════════════════════════════════

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0],
    });

    setAuthCookie(res, user);
    res.json(userResponse(user));
  } catch (err) {
    console.error('POST /api/auth/register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    setAuthCookie(res, user);
    res.json(userResponse(user));
  } catch (err) {
    console.error('POST /api/auth/login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS).json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.json(null);

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.json(null);
    }

    const user = await User.findById(payload.id).select('-passwordHash -resetToken -phoneOtp');
    if (!user) return res.json(null);

    res.json(userResponse(user));
  } catch (err) {
    console.error('GET /api/auth/me error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ═══════════════════════════════════════════════════════════

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetToken = resetTokenHash;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
    }

    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken: resetTokenHash,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful! You can now login.' });
  } catch (err) {
    console.error('POST /api/auth/reset-password error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PHONE OTP AUTH
// ═══════════════════════════════════════════════════════════

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number required' });
    }

    const otp = generateOtp();
    const otpExpiry = Date.now() + 600000;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        phoneOtp: otp,
        phoneOtpExpiry: otpExpiry,
      });
    } else {
      user.phoneOtp = otp;
      user.phoneOtpExpiry = otpExpiry;
      await user.save();
    }

    console.log(`📱 OTP for ${phone}: ${otp}`);

    if (user.email) {
      try {
        await sendOtpEmail(user.email, otp);
      } catch (e) {
        console.log('Could not send OTP email');
      }
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('POST /api/auth/send-otp error', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    const user = await User.findOne({
      phone,
      phoneOtp: otp,
      phoneOtpExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.phoneOtp = undefined;
    user.phoneOtpExpiry = undefined;
    user.phoneVerified = true;
    await user.save();

    setAuthCookie(res, user);
    res.json(userResponse(user));
  } catch (err) {
    console.error('POST /api/auth/verify-otp error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GOOGLE OAUTH
// ═══════════════════════════════════════════════════════════

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential required' });
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    const payload = await response.json();

    if (payload.error) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({
      $or: [{ googleId }, { email: email?.toLowerCase() }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        user.name = user.name || name;
        await user.save();
      }
    } else {
      user = await User.create({
        googleId,
        email: email?.toLowerCase(),
        name,
        avatar: picture,
      });
    }

    setAuthCookie(res, user);
    res.json(userResponse(user));
  } catch (err) {
    console.error('POST /api/auth/google error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN CREATION (DEV ONLY - Remove in production)
// ═══════════════════════════════════════════════════════════

router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.role = 'admin';
      await existing.save();
      setAuthCookie(res, existing);
      return res.json(userResponse(existing));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'admin',
    });

    setAuthCookie(res, user);
    res.json(userResponse(user));
  } catch (err) {
    console.error('POST /api/auth/create-admin error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;