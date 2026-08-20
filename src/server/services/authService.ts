import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { eventBus } from '../eventBus';
import { NotificationMicroservice } from './notificationService';
import { User, OTPRecord } from '../../types';

const JWT_SECRET = process.env.JWT_SECRET || 'tixora_microservices_jwt_secret_2026';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (id: string, role: string, email: string) => {
  return jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '30d' });
};

export class AuthMicroservice {
  public static readonly SERVICE_NAME = 'auth-service';

  // Register a new user
  public static async register(name: string, email: string, password?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const existing = Array.from(db.users.values()).find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const user: User = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user', // strictly default to user
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    db.users.set(newUserId, user);

    // Generate and store OTP
    const otp = generateOTP();
    const otpId = `otp_${Date.now()}`;
    const otpRecord: OTPRecord = {
      id: otpId,
      email: normalizedEmail,
      otp,
      action: 'account_verification',
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: new Date().toISOString()
    };

    // Remove any previous registration OTPs for this email
    for (const [k, v] of db.otps.entries()) {
      if (v.email.toLowerCase() === normalizedEmail && v.action === 'account_verification') {
        db.otps.delete(k);
      }
    }
    db.otps.set(otpId, otpRecord);

    // Call Notification Microservice to deliver 2FA code
    await NotificationMicroservice.sendOTP(normalizedEmail, otp, 'account_verification');

    // Publish to EventBus
    eventBus.publish('auth.user_registered', this.SERVICE_NAME, {
      userId: user.id,
      email: user.email,
      name: user.name
    });

    return {
      message: 'OTP sent to email. Please verify your account.',
      email: user.email
    };
  }

  // Login
  public static async login(email: string, password?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = Array.from(db.users.values()).find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.password && password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }
    }

    // If account is unverified and not an admin, require 2FA OTP verification
    if (!user.isVerified && user.role !== 'admin') {
      const otp = generateOTP();
      const otpId = `otp_${Date.now()}`;
      
      // Clean up previous registration OTPs
      for (const [k, v] of db.otps.entries()) {
        if (v.email.toLowerCase() === normalizedEmail && v.action === 'account_verification') {
          db.otps.delete(k);
        }
      }

      db.otps.set(otpId, {
        id: otpId,
        email: normalizedEmail,
        otp,
        action: 'account_verification',
        expiresAt: Date.now() + 10 * 60 * 1000,
        createdAt: new Date().toISOString()
      });

      await NotificationMicroservice.sendOTP(normalizedEmail, otp, 'account_verification');

      eventBus.publish('auth.verification_required', this.SERVICE_NAME, {
        userId: user.id,
        email: user.email
      });

      return {
        needsVerification: true,
        message: 'Account not verified. A new OTP has been sent to your email.',
        email: user.email
      };
    }

    // Generate token
    const token = generateToken(user.id, user.role, user.email);

    eventBus.publish('auth.user_logged_in', this.SERVICE_NAME, {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    };
  }

  // Verify OTP
  public static async verifyOTP(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find valid OTP record
    let foundRecordId: string | null = null;
    for (const [k, v] of db.otps.entries()) {
      if (v.email.toLowerCase() === normalizedEmail && v.otp === otp.trim() && v.action === 'account_verification') {
        if (v.expiresAt > Date.now()) {
          foundRecordId = k;
          break;
        }
      }
    }

    if (!foundRecordId) {
      throw new Error('Invalid or expired OTP code');
    }

    // Delete used OTP
    db.otps.delete(foundRecordId);

    // Update user verified flag
    const user = Array.from(db.users.values()).find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      throw new Error('User not found');
    }

    user.isVerified = true;
    db.users.set(user.id, user);

    const token = generateToken(user.id, user.role, user.email);

    eventBus.publish('auth.user_verified', this.SERVICE_NAME, {
      userId: user.id,
      email: user.email
    });

    return {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    };
  }

  // Inter-service lookup
  public static getUserById(id: string) {
    const user = db.users.get(id);
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }

  public static getAllUsers() {
    return Array.from(db.users.values()).map(u => {
      const { password, ...safeUser } = u;
      return safeUser;
    });
  }
}
