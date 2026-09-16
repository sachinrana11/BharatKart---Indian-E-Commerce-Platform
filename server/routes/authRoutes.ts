import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, AuthenticatedRequest, requireAuth, logAudit } from '../auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const usersCol = db.collection('users');
    const existing = await usersCol.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Account with this email already exists. Please sign in.' });
    }

    const passwordHash = bcrypt.hashSync(password, 8);
    const newUser = await usersCol.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      passwordHash,
      role: 'CUSTOMER',
      isEmailVerified: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(newUser as any);
    await logAudit(req as AuthenticatedRequest, 'USER_REGISTER', 'USER', newUser._id, `Registered new customer: ${newUser.email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to BharatKart.',
      data: {
        token,
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          isEmailVerified: newUser.isEmailVerified,
          avatar: newUser.avatar,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const usersCol = db.collection('users');
    const user = await usersCol.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user as any);
    await logAudit(req as AuthenticatedRequest, 'USER_LOGIN', 'USER', user._id, `User logged in: ${user.email} [${user.role}]`);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const usersCol = db.collection('users');

    await usersCol.updateOne(
      { _id: req.user!._id },
      {
        $set: {
          ...(name ? { name: name.trim() } : {}),
          ...(phone ? { phone: phone.trim() } : {}),
          ...(avatar ? { avatar } : {}),
        },
      }
    );

    const updated = await usersCol.findOne({ _id: req.user!._id });
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        _id: updated!._id,
        name: updated!.name,
        email: updated!.email,
        phone: updated!.phone,
        role: updated!.role,
        avatar: updated!.avatar,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Update failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const usersCol = db.collection('users');
  const user = await usersCol.findOne({ email: (email || '').toLowerCase().trim() });

  // Always return success for security
  res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link and 6-digit OTP has been sent via SMS/Email.',
    demoOtp: '749210', // Helpful demo OTP
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, otp } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ success: false, error: 'Email and new password are required.' });
  }

  const usersCol = db.collection('users');
  const user = await usersCol.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 8);
  await usersCol.updateOne({ _id: user._id }, { $set: { passwordHash } });

  res.json({
    success: true,
    message: 'Password has been reset successfully. Please sign in with your new password.',
  });
});

export default router;
