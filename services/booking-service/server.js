const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5003;
const JWT_SECRET = process.env.JWT_SECRET;

const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:5002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5004';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

if (!JWT_SECRET) {
  console.error('[booking-service] FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// In-Memory Bookings & Booking OTP Store
const bookings = new Map();
const bookingOtps = new Map();

// JWT Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'booking-service',
    status: 'healthy',
    uptime: process.uptime(),
    totalBookings: bookings.size,
    timestamp: new Date().toISOString()
  });
});

// 1. Request 2FA OTP for Booking
app.post('/request-otp', authenticateJWT, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const otp = generateOTP();

    bookingOtps.set(userEmail.toLowerCase(), {
      otp,
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Notify user via Notification Service
    try {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/send-otp`, {
        email: userEmail,
        otp,
        action: 'event_booking'
      });
    } catch (err) {
      console.warn('[booking-service] Notification service dispatch failed:', err.message);
    }

    res.json({ message: 'Verification OTP sent to your registered email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Create Booking (Requires 2FA OTP)
app.post('/', authenticateJWT, async (req, res) => {
  try {
    const { eventId, otp } = req.body;
    const userEmail = req.user.email.toLowerCase();

    if (!eventId || !otp) {
      return res.status(400).json({ message: 'Event ID and OTP are required' });
    }

    // Verify OTP
    const record = bookingOtps.get(userEmail);
    if (!record || record.otp !== otp.trim() || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired booking OTP code' });
    }
    bookingOtps.delete(userEmail);

    // Fetch Event from Event Service
    const eventRes = await axios.get(`${EVENT_SERVICE_URL}/${eventId}`);
    const event = eventRes.data;
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available for this event' });
    }

    // Create booking record
    const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newBooking = {
      _id: bookingId,
      id: bookingId,
      userId: {
        id: req.user.id,
        _id: req.user.id,
        email: req.user.email
      },
      eventId: {
        id: event.id,
        _id: event.id || event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        ticketPrice: event.ticketPrice,
        image: event.image
      },
      status: 'pending',
      paymentStatus: 'not_paid',
      amount: event.ticketPrice || 0,
      bookedAt: now,
      createdAt: now,
      updatedAt: now
    };

    bookings.set(bookingId, newBooking);

    res.status(201).json({
      message: 'Booking request submitted successfully. Awaiting confirmation.',
      booking: newBooking
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || error.message
    });
  }
});

// 3. Get Bookings (User or Admin)
app.get('/', authenticateJWT, (req, res) => {
  const list = Array.from(bookings.values());
  if (req.user.role === 'admin') {
    return res.json(list);
  }

  const userBookings = list.filter(b => {
    const bUid = typeof b.userId === 'string' ? b.userId : b.userId?.id || b.userId?._id;
    return bUid === req.user.id;
  });

  res.json(userBookings);
});

// 4. Confirm Booking (Admin)
app.put('/:id/confirm', authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const booking = bookings.get(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'confirmed') {
      return res.status(400).json({ message: 'Booking is already confirmed' });
    }

    const eventId = typeof booking.eventId === 'string' ? booking.eventId : booking.eventId?.id || booking.eventId?._id;

    // Call Event Service to decrement capacity atomically
    try {
      await axios.post(`${EVENT_SERVICE_URL}/${eventId}/adjust-seats`, { delta: -1 });
    } catch (err) {
      return res.status(400).json({ message: 'Failed to reserve event seat: ' + (err.response?.data?.message || err.message) });
    }

    booking.status = 'confirmed';
    if (req.body.paymentStatus) {
      booking.paymentStatus = req.body.paymentStatus;
    }
    booking.updatedAt = new Date().toISOString();
    bookings.set(req.params.id, booking);

    // Call Notification Service to dispatch confirmation
    const userEmail = typeof booking.userId === 'object' ? booking.userId.email : '';
    const eventTitle = typeof booking.eventId === 'object' ? booking.eventId.title : 'Event';
    if (userEmail) {
      try {
        await axios.post(`${NOTIFICATION_SERVICE_URL}/send-booking-confirmation`, {
          email: userEmail,
          userName: 'Attendee',
          eventTitle
        });
      } catch (err) {
        console.warn('[booking-service] Notification delivery failed:', err.message);
      }
    }

    res.json({ message: 'Booking confirmed successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Cancel Booking
app.put('/:id/cancel', authenticateJWT, async (req, res) => {
  try {
    const booking = bookings.get(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const bUid = typeof booking.userId === 'string' ? booking.userId : booking.userId?.id || booking.userId?._id;
    if (bUid !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to cancel this booking' });
    }

    const wasConfirmed = booking.status === 'confirmed';
    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    bookings.set(req.params.id, booking);

    // If previously confirmed, restore seat in Event Service
    const eventId = typeof booking.eventId === 'string' ? booking.eventId : booking.eventId?.id || booking.eventId?._id;
    if (wasConfirmed && eventId) {
      try {
        await axios.post(`${EVENT_SERVICE_URL}/${eventId}/adjust-seats`, { delta: 1 });
      } catch (err) {
        console.warn('[booking-service] Seat restoration failed:', err.message);
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Booking-Service] Listening on port ${PORT}`);
});
