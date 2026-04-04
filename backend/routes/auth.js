const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../db/supabaseClient');
const { validateBody } = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
router.post(
  '/register',
  validateBody({
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 8 },
    full_name: { required: true },
    role: { required: false, enum: ['patient', 'doctor'] },
  }),
  async (req, res) => {
    try {
      const { email, password, full_name, date_of_birth, gender, role, doctor_credentials } = req.body;
      const userRole = role || 'patient';

      if (userRole === 'doctor' && !doctor_credentials) {
        return res.status(400).json({
          success: false,
          error: 'Doctor credentials are required for doctor registration',
          code: 'VALIDATION_ERROR',
        });
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        if (authError.message.includes('already')) {
          return res.status(400).json({
            success: false,
            error: 'An account with this email already exists',
            code: 'DUPLICATE_EMAIL',
          });
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Hash password for our own JWT auth
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          role: userRole,
          doctor_credentials: userRole === 'doctor' ? doctor_credentials : null,
        });

      if (profileError) throw profileError;

      // Store password hash in a way we can verify later
      // We'll use Supabase user metadata for this
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { password_hash: passwordHash },
      });

      // Generate JWT
      const token = jwt.sign(
        { id: userId, email, role: userRole },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, COOKIE_OPTIONS);
      res.status(201).json({
        success: true,
        data: {
          id: userId,
          email,
          full_name,
          role: userRole,
        },
      });
    } catch (err) {
      console.error('Registration error:', err.message);
      res.status(500).json({
        success: false,
        error: 'Registration failed. Please try again.',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  validateBody({
    email: { required: true, type: 'email' },
    password: { required: true },
  }),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Get user from Supabase Auth
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const authUser = users.users.find((u) => u.email === email);
      if (!authUser) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'UNAUTHORIZED',
        });
      }

      // Verify password
      const passwordHash = authUser.user_metadata?.password_hash;
      if (!passwordHash || !(await bcrypt.compare(password, passwordHash))) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'UNAUTHORIZED',
        });
      }

      // Get profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;

      // Generate JWT
      const token = jwt.sign(
        { id: profile.id, email: profile.email, role: profile.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('token', token, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({
        success: false,
        error: 'Login failed. Please try again.',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.status(200).json({ success: true, data: { message: 'Logged out' } });
});

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validateBody({ email: { required: true, type: 'email' } }),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Use Supabase password reset
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/login`,
      });

      if (error) throw error;

      // Always return success to avoid email enumeration
      res.status(200).json({
        success: true,
        data: { message: 'If an account exists with this email, a reset link has been sent.' },
      });
    } catch (err) {
      console.error('Password reset error:', err.message);
      res.status(200).json({
        success: true,
        data: { message: 'If an account exists with this email, a reset link has been sent.' },
      });
    }
  }
);

// GET /api/auth/me - get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;
