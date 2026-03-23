const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // This needs to be installed
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Google OAuth Login/Signup ───────────────────────────────────────────────
router.post('/google', async (req, res, next) => {
  console.log('📬 [Auth] Received Google login request. Body keys:', Object.keys(req.body));
  const { idToken } = req.body;
  
  if (!idToken) {
    console.warn('⚠️ [Auth] Missing idToken in request body');
    return res.status(400).json({ error: 'ID Token is required' });
  }

  try {
    console.log('🔍 [Auth] Verifying ID token...');
    // 1. Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    console.log(`✅ [Auth] Token verified for: ${email}`);

    // 2. Find or Create User
    console.log('💾 [Auth] Database lookup for user...');
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });

    if (!user) {
      console.log('🆕 [Auth] Creating new user...');
      user = new User({
        googleId,
        email,
        name,
        picture,
      });
      await user.save();
    } else if (!user.googleId) {
      console.log('🔗 [Auth] Linking existing user with Google ID...');
      user.googleId = googleId;
      if (!user.picture) user.picture = picture;
      await user.save();
    }

    // 3. Generate Application JWT
    console.log('🔑 [Auth] Generating application JWT...');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment');
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🚀 [Auth] Login successful');
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('❌ [Auth] Google Auth Error Exception:', error);
    if (error.stack) console.error(error.stack);
    
    // Check for specific error types if needed
    const message = error.message || 'Authentication failed';
    const status = 500;

    res.status(status).json({ 
      error: 'Authentication failed', 
      details: message,
      code: error.code || 'AUTH_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ── Email/Password Signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('❌ [Auth] Signup Error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

// ── Email/Password Login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('❌ [Auth] Login Error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// ── Get Current User Profile ────────────────────────────────────────────────
// This will be used to verify the JWT and keep the user logged in
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
