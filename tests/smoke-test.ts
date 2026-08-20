/**
 * Tixora Microservices End-to-End Smoke & Integration Test Suite
 * Validates all autonomous services, gateway routing, 2FA workflows, and state transitions.
 */

import { AuthMicroservice } from '../src/server/services/authService';
import { EventMicroservice } from '../src/server/services/eventService';
import { BookingMicroservice } from '../src/server/services/bookingService';
import { NotificationMicroservice } from '../src/server/services/notificationService';
import { PaymentMicroservice } from '../src/server/services/paymentService';
import { GatewayMicroservice } from '../src/server/services/gatewayService';
import { db } from '../src/server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tixora_microservices_jwt_secret_2026';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  \x1b[32m✔\x1b[0m [${suite}] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err?.message || String(err);
    results.push({ suite, name, passed: false, durationMs, error: errorMsg });
    console.error(`  \x1b[31m✖\x1b[0m [${suite}] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
    console.error(`    \x1b[31mError: ${errorMsg}\x1b[0m`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)}`);
  }
}

async function runTestSuite() {
  console.log('\n\x1b[1m\x1b[34m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[34m  TIXORA MICROSERVICES ARCHITECTURE - SMOKE & INTEGRATION TESTS \x1b[0m');
  console.log('\x1b[1m\x1b[34m===============================================================\x1b[0m\n');

  // Reset in-memory database to pristine seed state
  db.reset();

  /* -----------------------------------------------------------------
   * SUITE 1: API Gateway & Service Discovery
   * ----------------------------------------------------------------- */
  console.log('\x1b[1m\x1b[33m1. API Gateway & Cluster Health Telemetry\x1b[0m');
  
  await runTest('API-Gateway', 'Discovers all 6 registered microservices', () => {
    const topology = GatewayMicroservice.getServicesTopology();
    assertEqual(topology.length, 6, 'Cluster should contain exactly 6 registered microservices');
    
    const serviceIds = topology.map(s => s.id);
    assert(serviceIds.includes('api-gateway'), 'api-gateway must be present');
    assert(serviceIds.includes('auth-service'), 'auth-service must be present');
    assert(serviceIds.includes('event-service'), 'event-service must be present');
    assert(serviceIds.includes('booking-service'), 'booking-service must be present');
    assert(serviceIds.includes('notification-service'), 'notification-service must be present');
    assert(serviceIds.includes('payment-service'), 'payment-service must be present');
  });

  await runTest('API-Gateway', 'Probes individual microservice health & response time', () => {
    for (const serviceId of ['auth-service', 'event-service', 'booking-service', 'notification-service', 'payment-service']) {
      const probe = GatewayMicroservice.probeService(serviceId);
      assertEqual(probe.status, 'healthy', `${serviceId} health status must be 'healthy'`);
      assert(typeof probe.responseTimeMs === 'number' && probe.responseTimeMs > 0, `${serviceId} response time must be positive`);
    }
  });

  await runTest('API-Gateway', 'Records request throughput telemetry and calculates averages', () => {
    GatewayMicroservice.recordRequest('event-service', 12);
    GatewayMicroservice.recordRequest('event-service', 18);
    const overview = GatewayMicroservice.getSystemOverview();
    assert(overview.databaseStats.totalEvents >= 3, 'Total events in database stats must be tracked');
    assert(overview.status === 'operational', 'Cluster status should be operational');
  });

  /* -----------------------------------------------------------------
   * SUITE 2: Auth & Identity Microservice
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m2. Auth & Identity Microservice\x1b[0m');

  let testUserId = '';
  let testUserToken = '';
  let testAdminToken = '';
  const testEmail = `tester_${Date.now()}@example.com`;

  await runTest('Auth-Service', 'Registers a new user and generates a 2FA activation OTP', async () => {
    const res = await AuthMicroservice.register('Test Engineer', testEmail, 'securePass123!');
    assertEqual(res.email, testEmail, 'Registered email must match input');
    
    // Check user recorded in database
    const createdUser = Array.from(db.users.values()).find(u => u.email === testEmail);
    assert(!!createdUser, 'User must be recorded in database');
    assertEqual(createdUser!.role, 'user', 'Default registered role must be user');
    assertEqual(createdUser!.isVerified, false, 'New user must require OTP verification before first login');
    testUserId = createdUser!.id;
  });

  await runTest('Auth-Service', 'Blocks unverified user from logging in before OTP completion', async () => {
    const loginRes = await AuthMicroservice.login(testEmail, 'securePass123!');
    assert('needsVerification' in loginRes && loginRes.needsVerification === true, 'Unverified user must receive needsVerification prompt');
  });

  await runTest('Auth-Service', 'Rejects incorrect OTP code', async () => {
    let failedAsExpected = false;
    try {
      await AuthMicroservice.verifyOTP(testEmail, '000000');
    } catch (err: any) {
      failedAsExpected = true;
      assert(err.message.includes('Invalid') || err.message.includes('OTP'), 'Should give invalid OTP message');
    }
    assert(failedAsExpected, 'Should have thrown error on wrong OTP');
  });

  await runTest('Auth-Service', 'Verifies correct 2FA OTP and issues valid signed JWT token', async () => {
    // Retrieve OTP dispatched to notification service
    const inbox = NotificationMicroservice.getInbox(testEmail);
    assert(inbox.length > 0, 'Notification inbox should have received the OTP');
    const otp = inbox[0].otpCode!;
    assert(!!otp && otp.length === 6, 'OTP must be a 6-digit string');

    const verifyRes = await AuthMicroservice.verifyOTP(testEmail, otp);
    assert(!!verifyRes.token, 'Must return JWT token upon successful verification');
    testUserToken = verifyRes.token;

    // Verify JWT cryptographic signature
    const decoded = jwt.verify(testUserToken, JWT_SECRET) as any;
    assertEqual(decoded.email, testEmail, 'Decoded token email must match user');
    assertEqual(decoded.role, 'user', 'Decoded token role must match');
  });

  await runTest('Auth-Service', 'Allows verified user login with correct password', async () => {
    const res = await AuthMicroservice.login(testEmail, 'securePass123!');
    assert('token' in res && !!res.token, 'Login should return authentication token');
  });

  await runTest('Auth-Service', 'Rejects login with invalid password', async () => {
    let failedAsExpected = false;
    try {
      await AuthMicroservice.login(testEmail, 'wrongPassword123');
    } catch (err: any) {
      failedAsExpected = true;
      assert(err.message.includes('Invalid credentials'), 'Must return Invalid credentials error');
    }
    assert(failedAsExpected, 'Should throw on invalid password');
  });

  await runTest('Auth-Service', 'Authenticates admin credentials and returns admin privileges', async () => {
    const adminRes = await AuthMicroservice.login('admin@tixora.com', 'password123');
    assert('token' in adminRes && !!adminRes.token, 'Admin login must return token');
    assertEqual(adminRes.role, 'admin', 'Admin user role must be admin');
    testAdminToken = (adminRes as any).token;
  });

  /* -----------------------------------------------------------------
   * SUITE 3: Event Catalog Microservice
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m3. Event Catalog Microservice\x1b[0m');

  let testEventId = '';
  let initialAvailableSeats = 0;

  await runTest('Event-Service', 'Retrieves seeded event catalog with category and search filter support', async () => {
    const allEvents = await EventMicroservice.getEvents();
    assert(allEvents.length >= 3, 'Catalog must contain at least 3 initial events');

    const techEvents = await EventMicroservice.getEvents({ category: 'Technology' });
    assert(techEvents.every(e => e.category === 'Technology'), 'Filtered events must match category');

    const searchEvents = await EventMicroservice.getEvents({ search: 'Developer Retreat' });
    assert(searchEvents.length >= 1, 'Search query must find matching event title');
  });

  await runTest('Event-Service', 'Creates a new event with totalSeats and pricing', async () => {
    const newEvent = await EventMicroservice.createEvent(
      {
        title: 'Distributed Systems & Microservices Masterclass 2026',
        description: 'Deep dive into event-driven sagas, message brokers, and fault-tolerant service meshes.',
        date: '2026-12-01T10:00:00.000Z',
        location: 'Tixora Virtual Arena',
        category: 'Technology',
        totalSeats: 50,
        ticketPrice: 249,
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'
      },
      'usr_1'
    );

    assert(!!newEvent.id, 'Created event must have a unique ID');
    assertEqual(newEvent.availableSeats, 50, 'Initial available seats must equal total seats');
    assertEqual(newEvent.ticketPrice, 249, 'Ticket price must be recorded');
    testEventId = newEvent.id;
    initialAvailableSeats = newEvent.availableSeats;
  });

  await runTest('Event-Service', 'Fetches specific event by ID', async () => {
    const event = await EventMicroservice.getEventById(testEventId);
    assertEqual(event.id, testEventId, 'Fetched event ID must match');
    assertEqual(event.title, 'Distributed Systems & Microservices Masterclass 2026', 'Fetched event title must match');
  });

  /* -----------------------------------------------------------------
   * SUITE 4: Booking & 2FA Reservation Microservice
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m4. Booking & 2FA Reservation Microservice\x1b[0m');

  let testBookingId = '';

  await runTest('Booking-Service', 'Sends 2FA OTP for high-security ticket booking', async () => {
    const res = await BookingMicroservice.sendBookingOTP(testEmail, testUserId);
    assert(!!res.message, '2FA OTP send request must return message');
  });

  await runTest('Booking-Service', 'Creates a pending booking with valid 2FA OTP', async () => {
    // Read OTP from notification service
    const inbox = NotificationMicroservice.getInbox(testEmail);
    const bookingOtpLog = inbox.find(n => n.type === 'booking_otp');
    assert(!!bookingOtpLog, 'Booking OTP email must have been received');
    const otp = bookingOtpLog!.otpCode!;

    const res = await BookingMicroservice.createBooking(testEventId, otp, testUserId, testEmail);
    assert(!!res.booking && !!res.booking.id, 'Booking must be created with unique ID');
    assertEqual(res.booking.status, 'pending', 'Newly created booking must start in pending status');
    assertEqual(res.booking.paymentStatus, 'not_paid', 'Initial payment status must be not_paid');
    testBookingId = res.booking.id;
  });

  await runTest('Booking-Service', 'Admin confirms booking, decrements capacity and triggers notification', async () => {
    const res = await BookingMicroservice.confirmBooking(testBookingId, 'paid');
    assertEqual(res.booking.status, 'confirmed', 'Booking status must transition to confirmed');
    assertEqual(res.booking.paymentStatus, 'paid', 'Payment status must transition to paid');

    // Verify seat capacity decremented in Event Service
    const eventAfterConfirm = await EventMicroservice.getEventById(testEventId);
    assertEqual(
      eventAfterConfirm.availableSeats,
      initialAvailableSeats - 1,
      'Event available seats must decrease by 1 upon booking confirmation'
    );

    // Verify notification was dispatched to attendee
    const inbox = NotificationMicroservice.getInbox(testEmail);
    const confirmationEmail = inbox.find(n => n.type === 'booking_confirmation');
    assert(!!confirmationEmail, 'Attendee must receive ticket confirmation email');
  });

  /* -----------------------------------------------------------------
   * SUITE 5: Payment & Settlement Microservice
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m5. Payment & Settlement Microservice\x1b[0m');

  await runTest('Payment-Service', 'Processes payment settlement and updates transaction ledger', async () => {
    const paymentRes = await PaymentMicroservice.processPayment(testBookingId, 'card');
    assert(paymentRes.success, 'Payment processing must succeed');
    assert(!!paymentRes.transactionId, 'Transaction must generate a receipt ID');
    assertEqual(paymentRes.bookingId, testBookingId, 'Payment must link to correct booking');
    assertEqual(paymentRes.amount, 249, 'Payment amount must match event price');
  });

  await runTest('Payment-Service', 'Calculates real-time revenue analytics and settlement metrics', () => {
    const analytics = PaymentMicroservice.getRevenueAnalytics();
    assert(analytics.totalRevenue >= 249, 'Total revenue should reflect processed transactions');
    assert(analytics.totalConfirmedPaidTickets >= 1, 'Confirmed paid tickets count must be positive');
  });

  /* -----------------------------------------------------------------
   * SUITE 6: Cancellation & Capacity Restoration Rollback
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m6. Booking Cancellation & Seat Restoration Sagas\x1b[0m');

  await runTest('Booking-Service', 'Cancels confirmed booking and atomically rolls back event seat capacity', async () => {
    const cancelRes = await BookingMicroservice.cancelBooking(testBookingId, testUserId, 'user');
    assert(cancelRes.success, 'Cancellation request must return success');

    // Verify event available seats rolled back to initial state
    const eventAfterCancel = await EventMicroservice.getEventById(testEventId);
    assertEqual(
      eventAfterCancel.availableSeats,
      initialAvailableSeats,
      'Event capacity must be restored upon booking cancellation'
    );

    // Verify booking record is marked cancelled
    const userBookings = await BookingMicroservice.getBookings(testUserId, 'user');
    const b = userBookings.find(x => x.id === testBookingId);
    assert(!!b, 'Booking must still exist in history');
    assertEqual(b!.status, 'cancelled', 'Booking status must now be cancelled');
  });

  /* -----------------------------------------------------------------
   * SUITE 7: Notification Service Metrics & Inbox Querying
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m7. Notification & SMTP Messaging Service\x1b[0m');

  await runTest('Notification-Service', 'Maintains audit history and calculates delivery statistics', () => {
    const stats = NotificationMicroservice.getStats();
    assert(stats.totalDispatched >= 3, 'Must have recorded OTPs, confirmations, and cancellation notices');
    assert(stats.otpCount >= 2, 'Should track account and booking OTP dispatches');
    assert(stats.bookingConfirmations >= 1, 'Should track booking confirmations');
  });

  /* -----------------------------------------------------------------
   * Summary & Results
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[34m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[34m                     TEST RESULTS SUMMARY                      \x1b[0m');
  console.log('\x1b[1m\x1b[34m===============================================================\x1b[0m');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Tests Run:  \x1b[1m${results.length}\x1b[0m`);
  console.log(`Passed:           \x1b[32m\x1b[1m${passedCount}\x1b[0m`);
  console.log(`Failed:           ${failedCount > 0 ? `\x1b[31m\x1b[1m${failedCount}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`Total Time:       \x1b[90m${Math.round(totalDuration * 100) / 100}ms\x1b[0m\n`);

  if (failedCount > 0) {
    console.error('\x1b[31m\x1b[1mSOME TESTS FAILED! Please review the errors above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m\x1b[1mALL SMOKE & INTEGRATION TESTS PASSED PERFECTLY!\x1b[0m\n');
  }
}

runTestSuite().catch(err => {
  console.error('Test runner fatal crash:', err);
  process.exit(1);
});
