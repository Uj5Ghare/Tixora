const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004';

if (!JWT_SECRET) {
  console.error('[auth-service] FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// In-Memory User & OTP Store (or connected to MongoDB/Postgres in prod)
const users = new Map();
const otps = new Map();

// Seed initial users
(async () => {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  users.set('usr_admin_1', {
    id: 'usr_admin_1',
    name: 'Admin User',
    email: 'admin@tixora.com',
    password: passwordHash,
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString()
  });

  users.set('usr_demo_1', {
    id: 'usr_demo_1',
    name: 'Demo Attendee',
    email: 'user@tixora.com',
    password: passwordHash,
    role: 'user',
    isVerified: true,
    createdAt: new Date().toISOString()
  });
})();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateToken = (id, role, email) => jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '30d' });

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    uptime: process.uptime(),
    userCount: users.size,
    timestamp: new Date().toISOString()
  });
});

// Register User
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = Array.from(users.values()).find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newUser = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      isVerified: false,
      createdAt: new Date().toISOString()
    };
    users.set(newUserId, newUser);

    // Generate OTP
    const otp = generateOTP();
    otps.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

    // Call Notification Microservice
    try {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/send-otp`, {
        email: normalizedEmail,
        otp,
        action: 'account_verification'
      });
    } catch (err) {
      console.warn('[auth-service] Notification microservice unreachable:', err.message);
    }

    res.status(201).json({
      message: 'OTP sent to email. Please verify your account.',
      email: newUser.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = Array.from(users.values()).find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (password) {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    if (!user.isVerified && user.role !== 'admin') {
      const otp = generateOTP();
      otps.set(normalizedEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

      try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/send-otp`, {
          email: normalizedEmail,
          otp,
          action: 'account_verification'
        });
      } catch (err) {
        console.warn('[auth-service] Notification dispatch failed:', err.message);
      }

      return res.json({
        needsVerification: true,
        message: 'Account not verified. A new OTP has been sent to your email.',
        email: user.email
      });
    }

    const token = generateToken(user.id, user.role, user.email);
    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const record = otps.get(normalizedEmail);

    if (!record || record.otp !== (otp || '').trim() || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    otps.delete(normalizedEmail);

    const user = Array.from(users.values()).find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = true;
    users.set(user.id, user);

    const token = generateToken(user.id, user.role, user.email);
    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Inter-Service / Protected User Lookups
app.get('/users', (req, res) => {
  const safeUsers = Array.from(users.values()).map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.listen(PORT, () => {
  console.log(`[Auth-Service] Listening on port ${PORT}`);
});
