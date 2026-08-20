const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// In-Memory Notification Audit Logs & Dispatch Stream
const notifications = [];

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'notification-service',
    status: 'healthy',
    uptime: process.uptime(),
    dispatchedCount: notifications.length,
    timestamp: new Date().toISOString()
  });
});

// Send 2FA OTP Email / SMS
app.post('/send-otp', (req, res) => {
  const { email, otp, action } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const isBooking = action === 'event_booking';
  const subject = isBooking
    ? `🔐 Tixora Booking Verification Code: ${otp}`
    : `🚀 Verify your Tixora Account: ${otp}`;

  const content = isBooking
    ? `Use verification code ${otp} to confirm your ticket reservation on Tixora. This code expires in 10 minutes.`
    : `Welcome to Tixora! Your 6-digit account activation code is ${otp}. Please enter it to complete your registration.`;

  const log = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recipientEmail: email,
    type: isBooking ? 'booking_otp' : 'account_verification_otp',
    subject,
    otpCode: otp,
    content,
    status: 'delivered',
    timestamp: new Date().toISOString()
  };

  notifications.unshift(log);
  console.log(`[Notification-Service] Dispatched 2FA OTP to ${email}: ${otp}`);

  res.json({ success: true, log });
});

// Send Booking Confirmation Email
app.post('/send-booking-confirmation', (req, res) => {
  const { email, userName, eventTitle } = req.body;
  if (!email || !eventTitle) {
    return res.status(400).json({ message: 'Email and eventTitle are required' });
  }

  const log = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    recipientEmail: email,
    recipientName: userName || 'Attendee',
    type: 'booking_confirmation',
    subject: `🎉 Ticket Confirmed: ${eventTitle}`,
    content: `Hello ${userName || 'Attendee'},\n\nGreat news! Your booking for "${eventTitle}" has been approved and confirmed. You are all set to attend!\n\nAccess your ticket details in your dashboard.`,
    status: 'delivered',
    timestamp: new Date().toISOString()
  };

  notifications.unshift(log);
  console.log(`[Notification-Service] Booking confirmation dispatched to ${email}`);

  res.json({ success: true, log });
});

// Get Inbox & Logs
app.get('/inbox', (req, res) => {
  const { email } = req.query;
  if (email) {
    const userLogs = notifications.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());
    return res.json(userLogs);
  }
  res.json(notifications.slice(0, 50));
});

// Metrics & Stats
app.get('/stats', (req, res) => {
  res.json({
    totalDispatched: notifications.length,
    otpCount: notifications.filter(n => n.otpCode).length,
    bookingConfirmations: notifications.filter(n => n.type === 'booking_confirmation').length
  });
});

app.listen(PORT, () => {
  console.log(`[Notification-Service] Listening on port ${PORT}`);
});
