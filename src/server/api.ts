import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthMicroservice } from './services/authService';
import { EventMicroservice } from './services/eventService';
import { BookingMicroservice } from './services/bookingService';
import { NotificationMicroservice } from './services/notificationService';
import { PaymentMicroservice } from './services/paymentService';
import { GatewayMicroservice } from './services/gatewayService';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tixora_microservices_jwt_secret_2026';

// Request timing & Gateway Telemetry Middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    let targetService = 'api-gateway';
    if (req.path.startsWith('/auth')) targetService = 'auth-service';
    else if (req.path.startsWith('/events')) targetService = 'event-service';
    else if (req.path.startsWith('/bookings')) targetService = 'booking-service';
    else if (req.path.startsWith('/notifications')) targetService = 'notification-service';
    else if (req.path.startsWith('/payments')) targetService = 'payment-service';

    GatewayMicroservice.recordRequest(targetService, duration);
    GatewayMicroservice.recordRequest('api-gateway', duration);
  });
  next();
});

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No authorization token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Access denied: Admin role required' });
    return;
  }
  next();
};

/* =========================================================================
   1. AUTH & USER MICROSERVICE ROUTES (/api/auth)
   ========================================================================= */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }
    const result = await AuthMicroservice.register(name, email, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    const result = await AuthMicroservice.login(email, password);
    if ('needsVerification' in result && result.needsVerification) {
      res.status(403).json(result);
      return;
    }
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Login failed' });
  }
});

router.post('/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP code are required' });
      return;
    }
    const result = await AuthMicroservice.verifyOTP(email, otp);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'OTP verification failed' });
  }
});

router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  const user = AuthMicroservice.getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
});

router.get('/auth/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  const users = AuthMicroservice.getAllUsers();
  res.json(users);
});

/* =========================================================================
   2. EVENT CATALOG MICROSERVICE ROUTES (/api/events)
   ========================================================================= */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const events = await EventMicroservice.getEvents({
      category: typeof category === 'string' ? category : undefined,
      search: typeof search === 'string' ? search : undefined
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch events' });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const event = await EventMicroservice.getEventById(req.params.id);
    res.json(event);
  } catch (error: any) {
    res.status(404).json({ message: error.message || 'Event not found' });
  }
});

router.post('/events', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, date, location, category, totalSeats, ticketPrice, image } = req.body;
    if (!title || !date || !location || !totalSeats) {
      res.status(400).json({ message: 'Title, date, location, and totalSeats are required' });
      return;
    }
    const event = await EventMicroservice.createEvent(
      { title, description, date, location, category, totalSeats, ticketPrice, image },
      req.user!.id
    );
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to create event' });
  }
});

router.put('/events/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const event = await EventMicroservice.updateEvent(req.params.id, req.body);
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to update event' });
  }
});

router.delete('/events/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await EventMicroservice.deleteEvent(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to delete event' });
  }
});

/* =========================================================================
   3. BOOKING MICROSERVICE ROUTES (/api/bookings)
   ========================================================================= */
router.post('/bookings/send-otp', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await BookingMicroservice.sendBookingOTP(req.user!.email, req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to send OTP' });
  }
});

router.post('/bookings', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventId, otp } = req.body;
    if (!eventId || !otp) {
      res.status(400).json({ message: 'eventId and otp are required' });
      return;
    }
    const result = await BookingMicroservice.createBooking(eventId, otp, req.user!.id, req.user!.email);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Booking creation failed' });
  }
});

// Admin confirm booking (supports both PUT /bookings/:id/confirm and PUT /bookings/:id)
router.put(['/bookings/:id/confirm', '/bookings/:id'], authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    const result = await BookingMicroservice.confirmBooking(req.params.id, paymentStatus);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Confirmation failed' });
  }
});

router.get(['/bookings/my', '/bookings'], authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await BookingMicroservice.getBookings(req.user!.id, req.user!.role);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch bookings' });
  }
});

router.delete('/bookings/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await BookingMicroservice.cancelBooking(req.params.id, req.user!.id, req.user!.role);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to cancel booking' });
  }
});

/* =========================================================================
   4. NOTIFICATION & INBOX ROUTES (/api/notifications)
   ========================================================================= */
router.get('/notifications/inbox', (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  const list = NotificationMicroservice.getInbox(email);
  res.json(list);
});

router.get('/notifications/stats', (req: Request, res: Response) => {
  res.json(NotificationMicroservice.getStats());
});

/* =========================================================================
   5. PAYMENT & SETTLEMENT ROUTES (/api/payments)
   ========================================================================= */
router.post('/payments/process', authenticate, async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentMethod } = req.body;
    if (!bookingId) {
      res.status(400).json({ message: 'bookingId is required' });
      return;
    }
    const result = await PaymentMicroservice.processPayment(bookingId, paymentMethod);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Payment processing failed' });
  }
});

router.get('/payments/analytics', authenticate, requireAdmin, (req: Request, res: Response) => {
  const stats = PaymentMicroservice.getRevenueAnalytics();
  res.json(stats);
});

/* =========================================================================
   6. API GATEWAY & MICROSERVICES TELEMETRY (/api/gateway)
   ========================================================================= */
router.get('/gateway/services', (req: Request, res: Response) => {
  const topology = GatewayMicroservice.getServicesTopology();
  res.json(topology);
});

router.get('/gateway/services/:id/health', (req: Request, res: Response) => {
  const probe = GatewayMicroservice.probeService(req.params.id);
  res.json(probe);
});

router.get('/gateway/health-probe', (req: Request, res: Response) => {
  const topology = GatewayMicroservice.getServicesTopology();
  const probes = topology.map((svc) => GatewayMicroservice.probeService(svc.id));
  res.json({
    clusterStatus: 'operational',
    timestamp: new Date().toISOString(),
    totalServices: topology.length,
    healthyCount: topology.filter((s) => s.status === 'healthy').length,
    services: probes
  });
});

router.get('/gateway/telemetry', (req: Request, res: Response) => {
  const telemetry = GatewayMicroservice.getSystemOverview();
  res.json(telemetry);
});

router.post('/gateway/reset-db', (req: Request, res: Response) => {
  const result = GatewayMicroservice.resetDatabase();
  res.json(result);
});

export default router;
